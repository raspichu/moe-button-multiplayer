"use strict";
let socket = io.connect(window.location.host, { path: window.location.pathname+"socket.io" });
console.log('window.location.href: ', window.location);

socket.emit('new_user', 1);
socket.on('users_online', function (data) {
	showUsers(data);
});

socket.on('clicks_online', function (data) {
	showClicks(data);
});

let quotes = ["Kya!", "Yamete!", "Itai!", "Yamete oniichan", "Itai io, oniichan!", "Iada!", "Iaadaa, yamete oniichan!", "Moooo", "Yamete kudasai", "Yamete kudasai, oniichan"];
let buli = false;
let clicks = 0;
let clicksLocal = 0;
let timer;
let TimerNotenough;
let notifications_enabled = false;
let ended = false;

function writeCookie(name, value, days) {
	let date, expires;
	if (days) {
		date = new Date();
		date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
		expires = "; expires=" + date.toGMTString();
	} else {
		expires = "";
	}
	document.cookie = name + "=" + value + expires + "; path=/";
}

function showUsers(data) {
	$('#usersOnline').html('Users online: ' + data);
}

function showClicks(data) {
	$('#clicksOnline').html(data + ' clicks online');
}

function sendClicksToServer() {
	let datos = {
		id: document.cookie.split('=')[0],
		clicks: clicksLocal
	}
	$.ajax({
		url: './user_click',
		data: datos,
		method: 'POST',
		success: function (res, textStatus, xhr) {
			if (res.error) {
				alert('Error connecting to server, please refresh the page');
			}

		}
	});
}

function repeat(actualText) {
	let ram = Math.floor(Math.random() * 1000 + 1);
	let randomText;
	if (ram > 1) {
		randomText = quotes[Math.floor(Math.random() * quotes.length)];
	} else {
		return 'POMF!';
	}
	if (actualText == randomText) {
		return repeat(actualText);
	} else {
		return randomText;
	}
}
function notifyMe() {
	// Let's check if the browser supports notifications
	console.log("Check notifications");
	if (!("Notification" in window)) {
		notifications_enabled = true;
		console.error("This browser does not support desktop notification");

		// Let's check whether notification permissions have already been granted
	} else if (Notification.permission === "granted") {
		// If it's okay let's create a notification
		notifications_enabled = true;
		console.log("Already granted notifications");

		// Otherwise, we need to ask the user for permission
	} else if (Notification.permission === "denied") {
		console.log("Asking user for permission");
		Notification.requestPermission(function (permission) {
			// If the user accepts, let's create a notification
			notifications_enabled = true;
			console.log("Notifications granted!");
		});
	} else {
		console.log('Notification: ', Notification.permission);
	}
}

window.onload = function () {
	notifyMe();

	let datos = {
		id: null,
		clicks: clicksLocal
	}
	if (document.cookie) {
		datos.id = document.cookie.split('=')[0];
	}
	$.ajax({
		url: './cookie',
		data: datos,
		method: 'POST',
		success: function (res) {
			if (res.error) {
				writeCookie(res.id, res.id, 30);
			} else {
				console.log('res: ', res);
				clicksLocal = res.clicks;
				$('#clicksLocal').html(clicksLocal + ' clicks local');
			}
			$("#loader").css("display", "none");
			$("#content").css("display", "block");

		},
		error: function (res) {
			$("#loader").css("display", "none");
			$("#content").css("display", "block");
			$("#usersOnline").css("display", "none");
			$("#clicksCount").css("display", "none");
			$("#button").css("display", "none");
			$("#text").html('Error connecting with the server.');
			console.log(res);
		}
	});

	document.getElementById('button').addEventListener('click', function () {
		if (!ended) {
			if (!buli) {
				buli = true;
				timer = setTimeout(function () {
					clicks = 0;
					buli = false;
				}, 500);
			}
			clicks++;
			socket.emit('click', 1);
			clicksLocal++;
			sendClicksToServer();
			clearTimeout(TimerNotenough);
			$('#clicksLocal').html(clicksLocal + ' clicks local');
			if (buli && clicks > 5) {
				document.getElementById('text').innerHTML = "Kimochiiii!";
				clearTimeout(timer);
				ended = true;
				clicks = 0;
				buli = false;
				if (notifications_enabled) {
					try {
						let options = {
							icon: './img/kimochi.jpg',
							body: 'Kimochiii!!',
							tag: 'kimochi',
							renotify: true,
							vibrate: true
						}
						let myNotification = new Notification('Eroge Online', options);
					} catch (er) {
						console.log(er)
					}
				}
				timer = setTimeout(function () {
					document.getElementById('text').innerHTML = "That was too much oniichan!";
					ended = false;
					if (notifications_enabled) {
						try {
							let options = {
								icon: './img/toomuch.png',
								body: 'That was too much oniichan!',
								tag: 'kimochi',
								renotify: true,
							}
							let myNotification = new Notification('Eroge Online', options);
						} catch (er) {
							console.log(er)
						}
					}
				}, 5000);
			} else {
				document.getElementById('text').innerHTML = repeat(document.getElementById('text').innerHTML);
			}
			TimerNotenough = setTimeout(function () {
				document.getElementById('text').innerHTML = "Why we're not doing anything, oniichan?";
				if (notifications_enabled) {
					try {
						let options = {
							icon: './img/forget.png',
							body: 'Did you forget about me?... Oniichan?...',
							tag: 'kimochi',
							renotify: true,
						}
						let myNotification = new Notification('Eroge Online', options);
					} catch (er) {
						console.log(er)
					}
				}
			}, 1000 * 120);
		}
	});
};