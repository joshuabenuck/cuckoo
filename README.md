# cuckoo
Command utilities to interact with https://cuckoo.team. This is NOT affiliated with the owners or operators of that site.

# Running
    npm install
    
Most common usage scenario. Start a work or break timer: `node main.js --session <name> [--work|--break] <minutes>`

# Options
* *--session <name>*: Required paramter. This is what comes after the slash in your https://cuckoo.team/ url.
* *--work <minutes>*: Start a work for the specified number of minutes.\
* *--break <minutes>*: Start a break for the specified number of minutes.
* *--trace-all*: Trace all events sents by the server or other clients.
* *--trace-<event-name>*: Trace the specified event. Run with --help to see a list.

# TODO:
- [x] Trace known options to get a feel for the events.
- [x] Add the ability to start a timer from the command line.
- [ ] Add the ability to get timer type and status from the command line.
- [ ] Lots more...
