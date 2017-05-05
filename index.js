let express = require('express')

let http = require('http');
let socketio = require('socket.io');

let app = express();
let server = http.createServer(app);
let io = socketio(server);

let path = require('path');
let cors = require('cors');
let expressJwt = require('express-jwt');
let socketioJwt = require('socketio-jwt');
let fs = require('fs');
let jwt = require('jsonwebtoken');

let mongodb = require('mongodb');
let MongoClient = mongodb.MongoClient,
  url = 'mongodb://localhost:27017/chess',
	Conn = MongoClient.connect(url);

let bodyParser = require('body-parser');
let multer = require('multer');
let upload = multer(),
	port = 9000;

app.use(cors())
app.use('/users', expressJwt({
	secret: "my top secret!"
}).unless({ path: ['/login', '/signup'] }))


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
	const username = req.body.username;
  const password = req.body.password;

	Conn.then(db => {
		const Users = db.collection('users');

    Users.findOne({ username })
			.then(result => {
        if (result.password === password) {
					const token = jwt.sign({ username }, 'my top secret!')
					res.status(200).json(token)
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
            const token = jwt.sign({ username }, 'my top secret!')

						res.status(200).json(token);
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

io.on('connection', socketioJwt.authorize({
	secret: "my top secret!",
	timeout: 15000
}))

io.on("authenticated", (socket) => {
	socket.on('create-new-room', (room) => {
		Conn.then(db => {
			const Rooms = db.collection('rooms');

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
