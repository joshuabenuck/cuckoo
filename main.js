#!/usr/bin/env node

const winston = require("winston")
const transports = {
  console: new winston.transports.Console()
}
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    transports.console
  ]

})

const applyDefaults = (argv) => {
  if (argv["log-level"]) {
    logger.level = argv["log-level"]
    transports.console.level = arg["log-level"]
  }

  const yaml = require('js-yaml');
  const fs   = require('fs');

  try {
    var config = yaml.safeLoad(fs.readFileSync('~/.cuckoo', 'utf8'));
  } catch (e) {
    logger.debug("error while loading config file.")
    logger.debug(e)
  }

  logger.debug(config)
  argv.session || (config.session && (argv.session = config.session))
  argv.defaultBreak = 5
  config.defaultBreak && (argv.defaultBreak = config.defaultBreak)
  argv.defaultWork = 25
  config.defaultWork && (argv.defaultWork = config.defaultWork)
}

const TIMER_FINISHED = "finish timer"
const UPDATE_SESSIONS = "update sessions"
const UPDATE_TIMER = "update timer"
const PING = "ping"
const events = [
  "connection",
  PING,
  UPDATE_TIMER,
  TIMER_FINISHED,
  "update user",
  "update users",
  UPDATE_SESSIONS,
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
  .describe("log-level", "Set the log level.")
  .describe("prompt", "Start a timer after prompting for info.")
  //.middleware(applyDefaults, true)
  .demandOption("session")
  .parse()
if (argv.level == "all") argv.level=ALL
if (argv.level == "concise") argv.level=CONCISE

const io = require('socket.io-client')(`https://cuckoo.team/${argv.session}`)

// If only the keep alive is running, quit anyway.
io.on(PING, (e) => {
  io.emit("pong");
});

const joinCuckoo = () => {
  io.emit("update user", "Cuckoo CLI")
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
  logger.info(`Registering listener for the ${event} event.`)
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

for (let event of Object.keys(argv)) {
  if (event.startsWith("trace-")) {
    if event.indexOf("all") != -1) {
      traceAll(argv.level)
      continue
    }
    traceEvent(event.split("trace-")[1].replace("-", " "), argv.level)
  }
}

const startTimer = (type, duration, currentType) => {
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
    off(UPDATE_SESSIONS, listener)
  }
  // HACK: Call the event handler directly
  // This really needs to be cleaner
  // Callbacks are getting out of control
  if(currentType) {
    listener({sessions: {currentType: currentType}})
    if (!waitingForSkip) return
  }
  on(UPDATE_SESSIONS, listener)
}

const getStatus = () => {
  listener = (e) => {
    console.log(`Session type is: ${e.sessions.currentType}.`)
    if (e.timer.current != 0) {
      console.log(`It has ${e.timer.currentFormatted} left.`)
    }
    off(UPDATE_SESSIONS, listener)
  }
  on(UPDATE_SESSIONS, listener)
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
  let ipc = require("crocket"), server = new ipc();
  update_sessions = (e) => {
      finished = undefined
      current_formatted = undefined
      current_type = e.sessions.currentType == "work" ? "Work" : "Break"
  }
  update_timer = (e) => { current_formatted = e.currentFormatted }
  finish_timer = (e) => { finished = "Finished!" }
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
  server.listen({ "path": "/tmp/cuckoo.sock", reconnect: 1 }, (e) => { 
    if(e) throw e; 
    console.log('IPC listening on /tmp/cuckoo.sock');
  });

  server.on('error', (e) => { console.error('Communication error occurred: ', e); });
  on(UPDATE_SESSIONS, update_sessions)
  on(UPDATE_TIMER, update_timer)
  on(TIMER_FINISHED, finish_timer)
  server.on("/timer", timer)
}

if (argv["prompt"]) {
  // TODO: Load from file
  // TODO: Allow default to be the last used value
  const default_lengths = {
    "work": "25",
    "break": "5"
  }
  const readline = require("readline")
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  update_sessions = (e) => {
    let current_type = e.sessions.currentType == "work" ? "work" : "break"
    let type=current_type, length=default_lengths[current_type]
    let type_prompt = () => {
      rl.question(`What type of timer? [Enter for '${type}']\n`, (answer) => {
        if(answer) {
          if(answer != "w" && answer != "work" && answer != "b" && answer != "break") {
            type_prompt()
            return
          }
          if(answer == "w") answer = "work"
          if(answer == "b") answer = "break"
          type = answer
        }
        let length_prompt = () => {
          rl.question(`How long? [Enter for '${default_lengths[type]}']\n`, (answer) => {
            if(answer) {
              if(isNaN(parseInt(answer))) { length_prompt(); return }
              length = answer
            }
            rl.close()
            startTimer(type, length, current_type == "break" ? "breakTime" : "work")
            off(UPDATE_SESSIONS, update_sessions)
          })
        }
        length_prompt()
      })
    }
    type_prompt()
  }
  on(UPDATE_SESSIONS, update_sessions)
}

if (LISTENER_COUNT == 0) {
  io.disconnect()
}
