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

  socket.on('disconnect', () => {
    try {
      session.run(
        "MATCH (u:User { username: {username} }) SET u.active = false",
        { username: socket.decoded_token.username }
      );
    }
    catch (err) {
      console.error(err);
    }
  })

  socket.on('get-rooms', async () => {
    try {

      const rooms = (await session.run("MATCH (room: Room) RETURN room"))
        .records
        .map(record => record.get('room').properties)
        .map(room => {
          room.id = room.id.toInt()
          return room
        });

      socket.emit('rooms', rooms);
    }
    catch (err) {
      console.error(err);
    }
  })

  socket.on('create-room', async (title, maxPlayers, game) => {
    try {
      maxPlayers = 4;
      if (Number(maxPlayers) || Number.isInteger(Number(maxPlayers)))
      {
        maxPlayers = maxPlayers;
      };

      title = title || "None";
      game = game || "chess";

      let username = socket.decoded_token.username;

      let checkRoom$ = await session.run(
        "MATCH (u: User { username: {username} })"
        + " CREATE UNIQUE (u)-[:LEVEL { level: 1 }]->(g: Game { game: {game} })",
        { username, game }
      )

      let joinRoom$ = await session.run(
        "MATCH (u: User { username: {username} })"
        + " CREATE UNIQUE (u)-[:HOST]->(r: Room { title: {title}, maxPlayers: {maxPlayers}, game: {game} }), (u)-[:MEMBER]->(r)"
        + " SET r.id = ID(r)"
        + " RETURN r",
        { title, maxPlayers, game, username }
      )

      let room = joinRoom$.records[0].get('r').properties;

      room.id = room.id.toInt();
      room.numberOfPlayers = 1;

      socket.join(room.id);
      socket.emit('room-confirmed', room);
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

      let numberOfPlayers = checkRoom$.records[0].get('count').toInt();
      let room = checkRoom$.records[0].get('r').properties;

      if (numberOfPlayers < room.maxPlayers) {
        let createLv = await session.run(
          "MATCH (u: User { username: {username} })"
          + " CREATE UNIQUE (u)-[:LEVEL { level: 1 }]->(g: Game { game: {game} })",
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
      else {
        let waitFor$ = await session.run(
          "MATCH (u: User { username: {username} })"
          + " CREATE UNIQUE (u)-[:WAIT]->(:Room { id: {roomId} })",
          { username, roomId }
        );

        let waitingPlayers$ = await session.run(
          "MATCH (r: Room { id: {roomId} })<-[:WAIT]-(u:User) RETURN u",
          { roomId }
        );

        let players = waitingPlayers$.records.map(player => player.get('u').properties)

        socket.in(roomId).broadcast('waiting-players', players);
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
          "MATCH (u: User { username: {username} })"
          + " CREATE UNIQUE (u)-[:LEVEL { level: 1 }]->(g: Game { game: {game} })",
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

  })

  socket.on('eject-player', (playerId) => {

  })

  socket.on('ready', async () => {
    let username = socket.decoded_token.username;

    let ready$ = await session.run(
      "MATCH (u: User { username }) SET u.ready = true",
      { username }
    )

    let room$ = await session.run(
      'MATCH (u: User { username: {username} })-[:MEMBER]->(r:Room) RETURN r',
      { username }
    )

    let room = room$.records[0].get('r').properties;

    let roomPlayers$ = await session.run(
      "MATCH (u1: Username { username: {username} })-[:MEMBER]->(:Room)<-[:MEMBER]-(u2: User)"
      + " RETURN u2",
      { username }
    );

    let players = roomPlayers$.records.map(record => record.get('u2').properties);

    if (players.length < room.maxPlayers) {
      let allReady = roomPlayers$.records.map(record => record.get('u2').properties.ready)
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

        let result$ = session.run(
          "UNWIND {data} AS props"
          + " MATCH (u: User { username: props.username })-[l:LEVEL]->(g: Game { game: {game} })"
          + " SET l.level = l.level + props.result"
          + " RETURN u, l",
          { data, game }
        )

        let displayResult = result$.records.map(record => ({
          username: record.get('u').properties.username,
          level: record.get('l').properties.level
        }))

        socket.in(room.id).broadcast('game-over', displayResult);
        io.sockets.clients(room.id)
          .forEach(client => client.leave(room));
      }
    }
  })
})
