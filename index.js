const express = require('express')

const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const path = require('path');
const cors = require('cors');
const expressJwt = require('express-jwt');
const socketioJwt = require('socketio-jwt');
const fs = require('fs');
const jwt = require('jsonwebtoken');

const neo4j = require('neo4j-driver').v1;

const serverSecret = require('./secret')

const driver = neo4j.driver("bolt://localhost", neo4j.auth.basic(serverSecret.username, serverSecret.password));
const session = driver.session();

const bodyParser = require('body-parser');
const multer = require('multer');
const upload = multer(),
  port = 9000;

const key = "my top secret!";

app.use(cors())
app.use('/', expressJwt({
	secret: key
}).unless({
  path: [
    new RegExp('/', 'i'),
    new RegExp('/static/.*', 'i'),
    new RegExp('/assets/.*', 'i'),
    new RegExp('/login', 'i'),
    new RegExp('/signup', 'i')
  ]
}))


app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use('/static', express.static(path.resolve('./dist')))
app.use('/assets', express.static(path.resolve('./dist/assets')))

server.listen(process.env.PORT || port, () => {
	const port = server.address().port;
	console.log(`App listening on port ${port}`);
})

app.get('/', upload.array(), (req, res) => {
  res.sendFile(path.resolve('./dist/index.html'))
})

app.post('/login', upload.array(), async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password
    || username.match(/$^|\s+/) || password.match(/$^|\s+/))
  {
    res.status(401).send("Invalid username or password");
    return;
  }

  try {
    const match = await session.run(
      'MATCH (u: User { username: {username}, password: {password} }) RETURN u',
      { username, password })

    if (match.records.length > 0) {
      const token = jwt.sign({ username }, key)
      res.status(200).json({ token });
    }
    else {
      res.status(401).send("Invalid username or password")
    }
  }
  catch (err) {
    console.error(err);

    res.status(500).send("Server Error!")
  }
})

app.post('/signup', upload.array(), async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || username.match(/$^|\s+/) || password.match(/$^|\s+/)) {
    res.status(401).send("Invalid username or password");
    return;
  }

  try {
    const match = await session.run(
      'MATCH (u:User { username: {username} }) RETURN u',
      { username, password }
    )

    if (match.records.length === 0) {
      session.run(
        'CREATE (u:User { username: {username}, password: {password} })',
        { username, password }
      )

      const token = jwt.sign({ username }, key)
      res.status(200).json({ token });
    }
    else {
      res.status(401).send("Invalid username or password");
      return;
    }
  }
  catch (err) {
    console.error(err);

    res.status(500).send("Server Error!")
  }
})




io.sockets.on('connection', socketioJwt.authorize({
	secret: key,
	timeout: 15000
}))

io.sockets.on("authenticated", (socket) => {
  try {
    session.run(
      "MATCH (u:User { username: {username} }) SET u.active = true",
      { username: socket.decoded_token.username }
    );
  }
  catch (err) {
    console.error(err);
  }

  socket.on('disconnect', async () => {
    try {
      let removePlayer$ = await session.run(
        "MATCH (u:User { username: {username} }) SET u.active = false",
        { username: socket.decoded_token.username }
      );

      let checkMember$ = await session.run(
        "MATCH (u:User { username: {username} })-[m:MEMBER]->(r:Room) DELETE m RETURN r",
        { username: socket.decoded_token.username }
      )

      if (checkMember$.records.length === 0) {
        return;
      }

      let roomId = checkMember$.records[0].get('r').properties;

      session.run(
        "MATCH (r:Room { id: {roomId} }) WHERE size((r)<-[:MEMBER]-(:User)) = 0 DETACH DELETE r",
        { roomId }
      );
    }
    catch (err) {
      console.error(err);
    }
  })

  socket.on('get-rooms', async () => {
    try {

      let rooms$ = await session.run("MATCH (room: Room)<-[:MEMBER]-(u:User) RETURN room, count(u) as count");

      let rooms = rooms$
        .records
        .map(record => record.get('room').properties)
        .map((room, i) => {
          room.id = room.id.toInt && room.id.toInt()
            || room.id;
          room.numberOfPlayers = rooms$.records[i].get('count').toInt();
          return room
        });

      socket.emit('rooms', rooms);
    }
    catch (err) {
      console.error(err);
    }
  })

  socket.on('check-room', async () => {
    try {

      let username = socket.decoded_token.username;

      let room$ = await session.run(
        "MATCH (u: User { username: {username} })-[:MEMBER]-(r:Room)"
        + " RETURN r",
        { username }
      );

      if (room$.records.length !== 0) {
        let room = room$.records[0].get('r').properties;
        room.id = room.id.toInt && room.id.toInt()
          || room.id;

        let players$ = await session.run(
          "MATCH (g: Game)<-[l:LEVEL]-(u: User)-[:MEMBER]->(r:Room { id: {roomId} }) WHERE g.game = r.game RETURN u, l",
          { roomId: room.id }
        )

        let players = players$.records
          .map(record =>
            record.get('u').properties);

        for (let i = 0; i < players.length; ++i) {
          players[i].level = players$.records[i].get('l').properties.level.toInt && players$.records[i].get('l').properties.level.toInt()
            || players$.records[i].get('l').properties.level;
        }

        socket.emit('room-confirmed', room);
        socket.emit('room-players', players);
      }
      else {
        socket.emit('no-room');
      }
    }
    catch (err) {
      console.error(err);
    }
  })

  socket.on('create-room', async (title, maxPlayers, game) => {
    try {
      let defaultMaxPlayers = 4;
      if (!Number(maxPlayers) || !Number.isInteger(Number(maxPlayers)))
      {
        maxPlayers = defaultMaxPlayers;
      };

      title = title || "None";
      game = game || "chess";

      let username = socket.decoded_token.username;

      let createGame$ = await session.run(
        "MERGE (g: Game { game: {game} })",
        { game }
      );

      let checkRoom$ = await session.run(
        "MATCH (u: User { username: {username} }), (g: Game { game: {game} })"
        + " MERGE (u)-[l:LEVEL]->(g) ON CREATE SET l.level = 1",
        { username, game }
      )

      let joinRoom$ = await session.run(
        "MATCH (u: User { username: {username} })"
        + " CREATE UNIQUE (u)-[:HOST]->(r: Room { title: {title}, maxPlayers: {maxPlayers}, game: {game} }), (u)-[:MEMBER]->(r)"
        + " SET r.id = ID(r)"
        + " RETURN r, u",
        { title, maxPlayers, game, username }
      )

      let room = joinRoom$.records[0].get('r').properties;
      room.id = room.id.toInt();
      room.numberOfPlayers = 1;

      let players$ = await session.run(
        "MATCH (g: Game)-[l:LEVEL]-(u: User)-[:MEMBER]->(r:Room { id: {roomId} }) WHERE g.game = r.game RETURN u, l",
        { roomId: room.id }
      )

      let players = players$.records
        .map(record =>
          record.get('u').properties);

      for (let i = 0; i < players.length; ++i) {
        players[i].level = players$.records[i].get('l').properties.level.toInt && players$.records[i].get('l').properties.level.toInt()
          || players$.records[i].get('l').properties.level;
      }

      socket.join(room.id);
      socket.emit('room-confirmed', room);
      io.to(room.id).emit('room-players', players);

      let rooms$ = await session.run(
        "MATCH (r: Room)<-[:MEMBER]-(u:User) RETURN r, count(u) AS count"
      )

      let rooms = rooms$.records.map(record => record.get('r').properties)
        .map((room, i) => {
          room.id = room.id.toInt();
          room.numberOfPlayers = rooms$.records[i].get('count').toInt();
          return room;
        });

      socket.broadcast.emit('rooms', rooms);
    }
    catch (err) {
      console.error(err);
    }
  })

  socket.on('join-room', async (roomId) => {
    try {
      let username = socket.decoded_token.username;

      let checkRoom$ = await session.run(
        "MATCH (r: Room { id: {roomId} })<-[:MEMBER]-(u: User)"
        + " RETURN count(u) AS count, r",
        { roomId }
      )

      if (checkRoom$.records.length === 0) {
        return;
      }

      let numberOfPlayers = checkRoom$.records[0].get('count').toInt();
      let room = checkRoom$.records[0].get('r').properties;

      if (numberOfPlayers < room.maxPlayers) {
        let createLv = await session.run(
          "MATCH (u: User { username: {username} }), (g: Game { game: {game} })"
          + " MERGE (u)-[l:LEVEL]->(g) ON CREATE SET l.level = 1",
          { username, game: room.game }
        );

        let noWait$ = await session.run(
          "MATCH (u: User { username: {username} })-[l:WAIT]->(:Room)"
          + " DELETE l",
          { username }
        );

        let joinRoom$ = await session.run(
          "MATCH (u: User { username: {username} }), (r: Room { id: {roomId} })"
          + " CREATE UNIQUE (u)-[:MEMBER]->(r)",
          { username, roomId }
        )

        let roomPlayers$ = await session.run(
          "MATCH (r: Room { id: {roomId} })<-[:MEMBER]-(u: User)-[l:LEVEL]->(g:Game) WHERE g.game = r.game"
          + " RETURN r, u, l",
          { roomId }
        )

        if (roomPlayers$.records.length === 0) {
          return;
        }

        let players = roomPlayers$.records
          .map(record => record.get('u').properties)
          .map((player, i) => {
            player.level = roomPlayers$.records[i].get('l').properties.level.toInt && roomPlayers$.records[i].get('l').properties.level.toInt()
              || roomPlayers$.records[i].get('l').properties.level ;
            return player;
          })

        room = roomPlayers$.records[0].get('r').properties;

        room.id = room.id.toInt();

        socket.join(roomId);
        socket.emit('room-confirmed', room);
        io.to(roomId).emit('room-players', players);
      }
      else {
        let waitFor$ = await session.run(
          "MATCH (u: User { username: {username} }), (r:Room { id: {roomId} })"
          + " CREATE UNIQUE (u)-[:WAIT]->(r)",
          { username, roomId }
        );

        let waitingPlayers$ = await session.run(
          "MATCH (r: Room { id: {roomId} })<-[:WAIT]-(u:User) RETURN u",
          { roomId }
        );

        let players = waitingPlayers$.records.map(player => player.get('u').properties)

        io.to(roomId).emit('waiting-players', players);
      }
    }
    catch (err) {
      console.error(err);
    }
  })

  socket.on('invite-player', async (username) => {
    try {
      let findRoom$ = await session.run(
        "MATCH (u: User { username: {username} })-[:MEMBER]->(r: Room)"
        + " RETURN r",
        { username: socket.decoded_token.username }
      );

      let roomId = findRoom$.records[0].get('r').properties.id;

      let checkRoom$ = await session.run(
        "MATCH (r: Room { id: {roomId} })<-[:MEMBER]-(u: User)"
        + " RETURN count(u) AS count, r",
        { roomId }
      )

      let numberOfPlayers = checkRoom$.records[0].get('count').toInt();
      let room = checkRoom$.records[0].get('r').properties;

      if (numberOfPlayers < room.maxPlayers) {
        let createLv = await session.run(
          "MATCH (u: User { username: {username} }), (g: Game { game: {game} })"
          + " MERGE (u)-[l:LEVEL]->(g) ON CREATE SET { level: 1 }",
          { username, game }
        );

        let noWait$ = await session.run(
          "MATCH (u: User { username: {username} })-[l:WAIT]->(:Room)"
          + " DELETE l",
          { username }
        );

        let joinRoom$ = await session.run(
          "MATCH (u: User { username: {username} })"
          + " CREATE UNIQUE (u)-[:MEMBER]->(r: Room { id: {roomId} })",
          { username, roomId }
        )

        let roomPlayers$ = await session.run(
          "MATCH (r: Room { id: {roomId} })<-[:MEMBER]-(u: User)"
          + " RETURN r, u",
          { roomId }
        )

        let players = roomPlayers$.records.map(record => record.get('u').properties);
        let room = roomPlayers$.records[0].get('r').properties;

        room.id = room.id.toInt();

        socket.join(roomId);
        socket.emit('room-confirmed', room);
        socket.in(roomId).broadcast('room-players', players);
      }
    }
    catch (err) {
      console.error(err);
    }
  })

  socket.on('exit-room', async () => {
    try {
      let removePlayer$ = await session.run(
        "MATCH (u:User { username: {username} })-[m:MEMBER]->(r:Room) SET u.active = false DELETE m RETURN r",
        { username: socket.decoded_token.username }
      );

      let roomId = removePlayer$.records[0].get('r').properties;

      session.run(
        "MATCH (r:Room { id: {roomId} }) WHERE size((r)<-[:MEMBER]-(:User)) = 0 DETACH DELETE r",
        { roomId }
      );

      socket.emit('no-room')
    }
    catch (err) {
      console.error(err);
    }
  })

  socket.on('eject-player', (playerId) => {

  })

  socket.on('ready', async () => {
    try {
      let username = socket.decoded_token.username;

      let ready$ = await session.run(
        "MATCH (u: User { username: {username} }) SET u.ready = true",
        { username }
      )

      let room$ = await session.run(
        'MATCH (u: User { username: {username} })-[:MEMBER]->(r:Room) RETURN r',
        { username }
      )

      if (room$.records.length === 0) {
        return;
      }

      let room = room$.records[0].get('r').properties;
      let roomId = room.id.toInt && room.id.toInt()
        || room.id;

      let roomPlayers$ = await session.run(
        "MATCH (u: User)-[:MEMBER]->(r:Room {id: {roomId} }) RETURN u",
        { roomId }
      );

      let players = roomPlayers$.records.map(record => record.get('u').properties);

      if (players.length === Number(room.maxPlayers)) {
        let allReady = roomPlayers$.records.map(record => {
          return record.get('u').properties.ready === "true" || record.get('u').properties.ready && record.get('u').properties.ready !== "false";
        })
          .reduce((pre, cur) => pre && cur, true);

        if (allReady) {
          let results = players
            .map(player =>
              Math.random() * room.maxPlayers)
            .map(result => Math.ceil(result));

          let data = results.map((result, i) => ({
            username: players[i].username,
            exp: result
          }))

          let game = room.game;

          let result$ = await session.run(
            "UNWIND {data} AS props"
            + " MATCH (u: User { username: props.username })-[l:LEVEL]->(g: Game { game: {game} })"
            + " SET l.level = l.level + props.exp"
            + " RETURN u, l",
            { data, game }
          )

          let displayResult = result$.records.map(record => ({
            username: record.get('u').properties.username,
            level: record.get('l').properties.level
          }))

          let done$ = await session.run(
            "MATCH (r: Room { id: {roomId} })<-[:MEMBER]-(u: User) SET u.ready = false",
            { roomId }
          )

          let removeRoom$ = await session.run(
            "MATCH (r: Room { id: {roomId} }) DETACH DELETE r",
            { roomId }
          )

          io.to(roomId).emit('game-over', displayResult);
        }
      }

    }
    catch (err) {
      console.error(err);
    }
  })
})
