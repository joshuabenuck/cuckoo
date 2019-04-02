#!/usr/bin/env node

const winston = require("winston")
const logger = winston.createLogger({
	level: 'info',
	format: winston.format.json(),
	transports: [
		new winston.transports.Console()
	]

})

const TIMER_FINISHED = "finish timer"
const events = [
	"connection",
	"ping",
	"update timer",
	TIMER_FINISHED,
	"update user",
	"update users",
	"update sessions",
	"update settings",
	"update activities",
	"update activity",
	"validation error",
	"user joined",
	"update roadmap"
]

const describeTraceOptions = (yarg) => {
	events.forEach((event) => {
		let e = event.replace(" ", "-")
		yarg.describe(`trace-${e}`, `Registers listener for the ${event} event.`)
	})
	return yarg
}

const CONCISE = "concise"
const ALL = {depth: null}

yarg = require("yargs")
argv = describeTraceOptions(yarg)
	.describe("trace-all", "Register listeners for all events.")
	.alias("level", "l")
	.describe("level", "Sets the event trace detail level.")
	.choices("level", ["all", "concise"])
	.describe("break <x>", "Start a break for <x> minutes.")
	.describe("work <x>", "Start a break for <x> minutes.")
	.describe("session <x>", "Join the <x> session.")
	.describe("status", "Shows current timer status.")
	.describe("tmux-server", "Starts daemon thread to handle requests from the tmux status line client.")
	.demandOption("session")
	.parse()
if (argv.level == "all") argv.level=ALL
if (argv.level == "concise") argv.level=CONCISE

const io = require('socket.io-client')(`https://cuckoo.team/${argv.session}`)

// If only the keep alive is running, quit anyway.
io.on("ping", (e) => {
	io.emit("pong");
});


const joinCuckoo = () => {
	io.emit("update user", "PyPortal")
	//io.emit("change email", "")
}

joinCuckoo()

let LISTENER_COUNT = 0
const on = (event, listener) => {
	LISTENER_COUNT+=1
	io.on(event, listener)
}

const off = (event, listener) => {
	LISTENER_COUNT-=1
	io.off(event, listener)
	if (LISTENER_COUNT == 0) {
		logger.debug("No more listeners. Exiting.")
		io.disconnect()
	}
}

const trace = (name, e, depth) => {
	if (depth == CONCISE) {
		logger.info(name)
		return
	}
	obj = {e}
	obj[name] = true
	console.dir(obj, depth);
}

const traceEvent = (event, depth) => {
	logger.info(`Registering listenter for the ${event} event.`)
	on(event, (e) => { trace(event, e, depth) })
}

const traceAll = (depth) => {
	events.forEach((event) => {
		traceEvent(event, depth)
	})
}

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

if (argv["trace-all"]) {
	traceAll(argv.level)
}

for (let event of Object.keys(argv)) {
	if (event.startsWith("trace-")
		&& event.indexOf("all") == -1) {
		traceEvent(event.split("trace-")[1].replace("-", " "), argv.level)
	}
}

const startTimer = (type, duration) => {
	let waitingForSkip = false
	let desiredType = type
	listener = (e) => {
    let sessionType = e.sessions.currentType
		if (!waitingForSkip && sessionType != desiredType) {
			waitingForSkip = true
			skipSessionType()
			return
		}
		console.log(`Started ${type} timer for ${duration} minutes.`)
		io.emit("start timer", duration)
		off("update activity", listener)
	}
	on("update activity", listener)
}

const getStatus = () => {
	listener = (e) => {
    console.log(`Session type is: ${e.sessions.currentType}.`)
    if (e.timer.current != 0) {
      console.log(`It has ${e.timer.currentFormatted} left.`)
    }
		off("update activity", listener)
	}
	on("update activity", listener)
}

if (argv["work"]) {
	startTimer("work", argv["work"])
}

if (argv["break"]) {
	startTimer("breakTime", argv["break"])
}

if (argv["status"]) {
  getStatus()
}

if (argv["tmux-server"]) {
	let current_formatted = undefined
	let current_type = undefined
	let finished = undefined
	let ipc = require("crocket"),
		server = new ipc();
	update_sessions = (e) => {
	    finished = undefined
	    current_formatted = undefined
	    current_type = e.sessions.currentType == "work" ? "Work" : "Break"
	}
	update_timer = (e) => {
		current_formatted = e.currentFormatted
	}
	finish_timer = (e) => {
		finished = "Finished!"
	}
	timer = (_payload) => {
		if (finished) {
			server.emit("/status", finished)
			return
		}
		if (current_formatted) {
			server.emit("/status", `${current_type}: ${current_formatted}`)
			return
		}
		server.emit("/status", `Next: ${current_type}`)
	}
	// Start listening, this example communicate by file sockets
	server.listen({ "path": "/tmp/cuckoo.sock", reconnect: 1 }, (e) => { 
		// Fatal errors are supplied as the first parameter to callback
		if(e) throw e; 
		// All is well if we got this far
		console.log('IPC listening on /tmp/cuckoo.sock');
	});

	// React to communication errors
	server.on('error', (e) => { console.error('Communication error occurred: ', e); });
	on("update sessions", update_sessions)
	on("update timer", update_timer)
	on("finish timer", finish_timer)
	server.on("/timer", timer)

}

if (LISTENER_COUNT == 0) {
	io.disconnect()
}
