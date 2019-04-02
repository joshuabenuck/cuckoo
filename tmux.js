#!/usr/bin/env node

var ipc = require("crocket"),
	client = new ipc();
	
client.connect({ "path": "/tmp/cuckoo.sock", "timeout": 250 }, (e) => { 
    if(e) {
	    console.log("Connection error")
	    process.exit(1)
    }
    client.emit('/timer');
});

client.on('/status', function (what) {
    console.log(what);
    // Work is done now, no need to keep a connection open
    client.close();
});

