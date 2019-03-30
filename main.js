var io = require('socket.io-client')("https://cuckoo.team/iamatest");

const joinCuckoo = () => {
	io.emit("update user", "PyPortal")
	//io.emit("change email", "")
}

joinCuckoo()

const CONCISE = "concise"
const ALL = {depth: null}

const debug = (name, e, depth) => {
	if (depth == CONCISE) {
		console.log(name)
		return
	}
	obj = {}
	obj[name] = true
	obj["e"] = e
	console.dir(obj, depth);
}

const TIMER_FINISHED = "finish-timer"
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

const debug_event = (event, depth) => {
	console.log(`Registering listenter for the ${event} event.`)
	io.on(event, (e) => { debug(event, e, depth) })
}

const debug_all = (depth) => {
	events.forEach((event) => {
		debug_event(event, depth)
	})
}

io.on("ping", (e) => {
	io.emit("pong");
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

const describeDebugOptions = (yarg) => {
	events.forEach((event) => {
		let e = event.replace(" ", "-")
		yarg.describe(`debug-${e}`, `Registers listener for the ${event} event.`)
	})
	return yarg
}

yarg = require("yargs")
argv = describeDebugOptions(yarg)
	.describe("debug-all", "Register listeners for all events.")
	.alias("level", "l")
	.describe("level", "Sets the level to log at.")
	.choices("level", ["all", "concise"])
	.describe("break <x>", "Start a break for <x> minutes.")
	.describe("work <x>", "Start a break for <x> minutes.")
	.parse()
if (argv.level == "all") argv.level=ALL
if (argv.level == "concise") argv.level=CONCISE

if (argv["debug-all"]) {
	debug_all(argv.level)
}

for (let event of Object.keys(argv)) {
	if (event.startsWith("debug-")
		&& event.indexOf("all") == -1) {
		debug_event(event.split("debug-")[1].replace("-", " "), argv.level)
	}
}

const startTimer = (type, duration) => {
	let sessionType = null
	let waitingForSkip = false
	let desiredType = type
	listener = (e) => {
		if (!waitingForSkip && sessionType != desiredType) {
			waitingForSkip = true
			skipSessionType()
			return
		}
		console.log(`Started ${type} timer for ${duration} minutes.`)
		io.emit("start timer", duration)
		io.off("update activity", listener)
	}
	io.on("update activity", listener)
}

if (argv["work"]) {
	startTimer("work", argv["work"])
}

if (argv["break"]) {
	startTimer("breakTime", argv["break"])
}

