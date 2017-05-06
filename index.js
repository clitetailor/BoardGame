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

const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient,
  url = 'mongodb://localhost:27017/chess',
	Conn = MongoClient.connect(url);

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

app.post('/login', upload.array(), (req, res) => {
  const { username, password } = req.body;

	Conn.then(db => {
		const Users = db.collection('users');

    if (!username || !password || username.match(/$^|\s+/) || password.match(/$^|\s+/)) {
      res.status(401).send("Invalid username or password");
      return;
    }

    Users.findOne({ username })
      .then(result => {
        if (result.password === password) {
					const token = jwt.sign({ username }, key)
					res.status(200).json({ token })
        }
        else {
					res.status(401).send("Invalid username or password")
        }
			})
			.catch(err => {
				res.status(401).send("Invalid username or password")
			})
	})
})

app.post('/signup', upload.array(), (req, res) => {
	const { username, password } = req.body;

	if (!username || !password || username.match(/$^|\s+/) || password.match(/$^|\s+/)) {
		res.status(401).send("Invalid username or password");
		return;
	}

	Conn.then(db => {
		const Users = db.collection('users');

		Users.findOne({ username })
      .then(data => {
        if (data !== undefined && data !== null) {
          res.status(409).send('Username already exists')

          return;
        }

				Users.insertOne({ username, password })
					.then(data => {
            const token = jwt.sign({ username }, key)

						res.status(200).json({ token });
					})
					.catch(err => {
            console.log(err);

            res.status(500);
					})
			})
			.catch(err => {
        console.log(err);

        res.status(500);
			})
	})
		.catch(err => {
			console.log(err);

			res.status(500);
		})
})



function getRooms() {
  return Conn.then(db =>
    db.collection('rooms').find({}));
}

function getRoom(room) {
  return Conn.then(db =>
    db.collection('rooms')
      .findOne(room))
}

function getRoomPlayers(roomId) {
  return Conn.then(db =>
    db.collection('players')
      .find({ roomId }))
}

function newRoom(room) {
  return Conn.then(db =>
    db.collection('rooms')
      .insertOne(room));
}

function setRoom(room, data) {
  return Conn.then(db =>
    db.collection('rooms')
      .findOneAndUpdate(room, data));
}

function setPlayer(player, data) {
  return Conn.then(db =>
    db.collection('player')
      .updateOne(player, data))
}



io.sockets.on('connection', socketioJwt.authorize({
	secret: key,
	timeout: 15000
}))

io.sockets.on("authenticated", (socket) => {

  Conn.then(db => {
    db.collection('players')
      .insertOne({ username: socket.decoded_token.username })
  })

  socket.on('disconnect', () => {
    Conn.then(db => {
      db.collection('players')
        .findOneAndDelete({ username: socket.decoded_token.username })
    })
  })

  socket.on('get-rooms', async () => {
    const rooms = await getRooms();
    socket.emit(rooms);
  })

  socket.on('create-room', async (room) => {

    const maxPlayers = 4;
    if (Number(room.maxPlayers) || Number.isInteger(Number(room.maxPlayers))) {
      maxPlayers = room.maxPlayers;
    };

    const title = room.title || "None";
    const numberOfPlayers = 1;
    const _room = { title, numberOfPlayers, maxPlayers }

    const roomResult = await newRoom(_room);
    const roomId = roomResult.insertedId;

    const playerResult = await setPlayer({ username: socket.decoded_token.username },
      { roomId: result.insertedId })

    socket.emit('room-confirmed', Object.assign({}, _room, {
      _id: result.insertedId
    }));
  })

	socket.on('join-room', async (roomId) => {
    let room = await findRoom(roomId);

    if (room.numberOfPlayers >= room.maxPlayers) {

    }
	})
})
