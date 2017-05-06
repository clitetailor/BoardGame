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



function findRoom(username) {
  return new Promise(resolve =>
  Conn.then(db => {
    let Players = db.collection('rooms');

    Players.findOne({ username })
      .then()
    })
  )
}


io.sockets.on('connection', socketioJwt.authorize({
	secret: key,
	timeout: 15000
}))

io.sockets.on("authenticated", (socket) => {

  Conn.then(db => {
    const Players = db.collection('players');

    Players.insertOne({ username: socket.decoded_token.username })
  })

  socket.on('disconnect', () => {
    Conn.then(db => {
      const Players = db.collection('players');

      Players.findOneAndDelete({ username: socket.decoded_token.username })
    })
  })

  socket.on('get-rooms', () => {

    Conn.then(db => {
      const Rooms = db.collection('rooms');
      const Players = db.collection('players');
      const rooms = Rooms.find({});

      socket.emit('rooms', rooms)
    })
  })

	socket.on('create-room', (room) => {
		Conn.then(db => {
      const Rooms = db.collection('rooms');
      const Players = db.collection('players');

      let maxPlayers = 4;
      if (Number(room.maxPlayers) || Number.isInteger(Number(room.maxPlayers))) {
        maxPlayers = room.maxPlayers;
      };

      let title = room.title || "None";
      let room = { title, numberOfPlayers, maxPlayers }

			Rooms.insertOne(room)
        .then(result => {

          let roomId = result.insertedId;

          Players.updateOne({ username: socket.decoded_token.username },
            { roomId },
            { upsert: true });

          socket.join(roomId);

          Room.find({})
            .then(rooms => {
              io.sockets.emit(rooms, rooms);
            })
				})
				.catch(err => {
					console.log(err);
        })
		})
  })

  socket.on('join-room', (roomId) => {
    Conn.then(db => {
      const Players = db.collection('players')
      const Rooms = db.collection('rooms');

    })
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
