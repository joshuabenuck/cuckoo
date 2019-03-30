var io = require('socket.io-client')("https://cuckoo.team/iamatest");

const joinCuckoo = () => {
	io.emit("update user", "PyPortal")
	//io.emit("change email", "")
}

joinCuckoo()

io.on("connection", (socket) => {
	console.log({connected: true, socket});
});

io.on("ping", (e) => {
	console.log({ping: true, e});
	io.emit("pong");
});

io.on("update timer", (e) => {
	console.log({updateTimer: true, e});
});

io.on("finish timer", (e) => {
	console.log({finishTimer: true, e});
});

io.on("update user", (e) => {
	console.log({updateUser: true, e});
});

io.on("update users", (e) => {
	console.log({updateUsers: true, e});
});

io.on("update sessions", (e) => {
	console.log({updateSessions: true, e});
});

io.on("update settings", (e) => {
	console.log({updateSettings: true, e});
});

io.on("update activity", (e) => {
	console.log({updateActivity: true, e});
});

io.on("validation error", (e) => {
	console.log({validationError: true, e});
});

io.on("user joined", (e) => {
	console.log({userJoined: true, e});
});

io.on("update roadmap", (e) => {
	console.log({updateRoadmap: true, e});
});

const skipSessionType = () => {
	io.emit("skip session");
}

const presetSession = (e) => {
	io.emit("preset session", e);
}

const toggleRoadmap = (e) => {
	io.emit("activate/deactivate roadmap");
}

const createRoadmapSession = (e) => {
	io.emit("create roadmap", e)
}

const clearRoadmap = (e) => {
	io.emit("clear roadmap")
}

