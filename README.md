# cuckoo
Command utilities to interact with https://cuckoo.team.

# Features
* Start a timer from the command line.
* Get current timer status.
* Show current timer status in tmux status line.
* Ability to see socket.io packets sent by server.

# Running Locally
    npm install
    npm link
    
# Usage
* *cuckoo --session <name> [--work|--break] <minutes>*: Start a work or break timer.
* *cuckoo --session <name> --status*: Get the current timer status.
* *cuckoo --session <name> --tmux-server*: Run in the background to support cuckoo-tmux.

# Usage: tmux status line config for .tmux.conf
* *set -g status-left "#(cuckoo-tmux)"*: Puts current timer status on left hand edge.
* *set status-interval 1*: Sets status update interval to every one second.

# Options
* *--session <name>*: Required paramter. This is what comes after the slash in your https://cuckoo.team/ url.
* *--work <minutes>*: Start a work for the specified number of minutes.
* *--break <minutes>*: Start a break for the specified number of minutes.
* *--trace-all*: Trace all events sents by the server or other clients.
* *--trace-<event-name>*: Trace the specified event. Run with --help to see a list.
* *--tmux-server*: Server side of mode designed to be used to show the current timer on the tmux status line.

# TODO:
- [x] Trace known options to get a feel for the events.
- [x] Add the ability to start a timer from the command line.
- [x] Add the ability to get timer type and status from the command line.
- [ ] Lots more...

