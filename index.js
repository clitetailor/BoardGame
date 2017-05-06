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
}).unless({ path: ['/', '/login', '/signup'] }))


app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use('/js', express.static(path.resolve('./dist/js')))
app.use('/assets', express.static(path.resolve('./dist/assets')))
app.use('/css', express.static(path.resolve('./dist/css')))

server.listen(process.env.PORT || port, () => {
	const port = server.address().port;
	console.log(`App listening on port ${port}`);
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



io.sockets.on('connection', socketioJwt.authorize({
	secret: key,
	timeout: 15000
}))

io.on("authenticated", (socket) => {

  socket.on('get-rooms', () => {
    // TODO: Replace faked rooms with rooms from  MongoDB

    Conn.then(db => {
      const Rooms = db.collection('rooms');
      const Users = db.collection('players');
      const rooms = Rooms.find({});

      socket.emit('rooms', [{
        _id: 35423542345,
        title: "bla, bla, bla",
        game: "yolo",
        maxPlayers: 4,
        numberOfPlayers: 3
      }])
    })
  })

	socket.on('create-room', (room) => {
		Conn.then(db => {
			const Rooms = db.collection('rooms');

      // TODO: fix maxPlayers
			const maxPlayers = !room.maxPlayers
				? 4 :
					room.maxPlayers >= 10
						? 10
						: room.maxPlayers > 1
							? room.maxPlayers
							: 2;

			Rooms.insertOne({
				title: room.title,
				players: 1,
				maxPlayers: room.maxPlayers
			})
				.then(result => {
					socket.emit('new-room-created', Object.assign({}, room, {
						_id: result.insertedId
					}));
				})
				.catch(err => {
					console.log(err);
				})
		})
  })

  socket.on('join-room', (roomId) => {

  })

	socket.on('request-join-room', (room) => {
		Conn.then(db => {
			const Rooms = db.collection('rooms');

			Rooms.findOne({
				_id: room._id
			})
				.then(room => {
					if (room.maxPlayers > room.players) {
						this.emit('approved', room);
					}
					else {
						// ????? socket id
						socket.broadcast(socket.id);
					}
				})
				.catch(err => {
					console.log(err);
				})
		})
	})

	socket.on('join-room', (room) => {
		Conn.then(db => {
			const Rooms = db.collection('rooms');

			Rooms.update({
				_id: room._id
			}, {
				$cond: {
					if: {
						$gt: ['$maxPlayers', '$players']
					},
					then: {
						$inc: {
							$players: 1
						}
					}
				}
			})
				.then(room => {
					socket.join('room', room._id);
				})
				.catch(err => {
					console.log(err);
				})
		})
	})
})
