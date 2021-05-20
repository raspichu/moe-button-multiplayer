"use strict";
const express = require("express");
const BodyParser = require("body-parser");
const MongoClient = require('mongodb').MongoClient;
const { mongo, conf } = require('./conf.js');
const app = express();
const server = require('http').Server(app);
// const logi = require('./node_files/logical.js');
const io = require('socket.io')(server);

const port = process.env.PORT || conf.PORT || 8080;


let timeUpdate = null;
let userList = new Map();

let users = 0;
let clicks = 0;

let id = 0;

app.set('view engine', 'ejs');

app.use(BodyParser.json());
app.use(BodyParser.urlencoded({
	extended: true
}));

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res) {
	res.render('index');
});
app.post('/cookie', function (req, res) {
	if (req.body.id) {
		lookForPlayer({ id: req.body.id }, function (a) {
			console.log('a: ', a);
			if (!a.error) {
				let b = userList.get(req.body.id);
				if (!b || b < a.user) {
					userList.set(req.body.id, a.user);
					b = userList.get(req.body.id);
				}
				res.send({
					clicks: b,
					error: false
				});
				res.end();
			} else {
				id++;
				savePlayer({ id: id, clicks: parseInt(req.body.clicks) });
				userList.set(id, parseInt(req.body.clicks));
				res.send({
					id: id,
					error: true
				});
				res.end();
			}
		});
	} else {
		id++;
		savePlayer({ id: id, clicks: parseInt(req.body.clicks) });
		userList.set(id, parseInt(req.body.clicks));
		res.send({
			id: id,
			error: true
		});
		res.end();
	}
});
app.post('/user_click', function (req, res) {
	if (userList.set(req.body.id, parseInt(req.body.clicks))) {
		let a = userList.get(req.body.id);
		res.send({
			clicks: a,
			error: false
		});
	} else {
		res.send({
			error: true
		});
	}
	res.end();
});

function serverClick() {
	collection.updateOne({ "id": "datos" }, { $set: { "clicks": clicks } }, (err) => {
		if (err) {
			console.log("Error saving on DataBase - serverClick");
		}
	});
	for (let index of userList) {
		if (index[0]) {
			collection.updateOne({ "id": "users" }, { $set: { [index[0]]: index[1] } }, (err) => {
				if (err) {
					console.log("Error saving on DataBase - serverClick");
				}
			});
		}
	}
	if (users === 0 && timeUpdate) {
		timeUpdate = null;
	}
}

function updateClicks() {
	collection.findOne({ "id": "datos" }, function (err, document) {
		if (clicks <= document.clicks) {
			clicks = document.clicks;
		}
		if (!timeUpdate) {
			timeUpdate = setInterval(serverClick, 5000);
		}
		io.sockets.emit('clicks_online', clicks);
	});
	collection.findOne({ "id": "datos" }, function (err, document) {
		if (id <= document.idNumber) {
			id = document.idNumber;
		}
	});
}

function savePlayer(data) {
	collection.updateOne({ "id": "datos" }, { $set: { "idNumber": id } }, (err) => {
		if (err) {
			console.log("Error saving on DataBase - savePlayer - id");
		}
	});
	console.log("Saving", data.id, data.clicks);
	collection.updateOne({ "id": "users" }, { $set: { [data.id]: data.clicks } }, (err) => {
		if (err) {
			console.log("Error saving on DataBase - savePlayer - user");
		}
	});
}

function lookForPlayer(data, cb) {
	collection.findOne({ "id": "users" }, function (err, document) {
		console.log('document: ', document, data.id);
		if (document[data.id] >= 0) {
			cb({ user: parseInt(document[data.id]), error: false });
			return;
		} else {
			cb({ user: null, error: true });
			return;
		}
	});
}

io.on('connection', function (socket) {
	console.log('Client connected');
	if (users == 0) {
		updateClicks();
	} else {
		io.sockets.emit('clicks_online', clicks);
	}
	users++;
	io.sockets.emit('users_online', users);
	socket.on('new_user', function (data) {
		io.sockets.emit('users_online', users);
	});
	socket.on('click', function (data) {
		clicks++;
		io.sockets.emit('clicks_online', clicks);
	});
	socket.on('disconnect', function () {
		users--;
		io.sockets.emit('users_online', users);
		console.log('Client disconnected');
	});
});

let DB = null;
let collection = null;

MongoClient.connect(mongo.url, mongo.options, (err, db) => {
	if (err) {
		console.log(err);
		return;
	}
	DB = db.db(mongo.database);
	collection = DB.collection(mongo.base_collection);


	server.listen(port, function () {
		console.log('Server Started on port ' + port);
	});
});
