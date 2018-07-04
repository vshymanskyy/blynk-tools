/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

var _ = require('lodash')
var util = require('util')
var events = require('events')

var debug = require('debug')('Serial')
var chalk = require('chalk')

var serialport = require('serialport')

function SerialClient(opts) {
  var port = opts.port

  opts.baudRate = opts.baudRate || opts.baudrate || opts.baud || 9600

  var client = new serialport(port, opts)

  client.on('open', function() {
    client.destroy = function() {
      client.close()
    };
    client.syn_endpoint = "serial:" + opts.port
    client.syn_direction = "out"
    client.emit("started", client)
  })
  client.on('error', (e) => {
    debug("Cannot open", port, ":", e);
  })

  return client
}


function SerialServer(opts) {
  var self = this;
  events.EventEmitter.call(this);

  opts.baudRate = opts.baudRate || opts.baudrate || opts.baud || 9600

  function refreshPorts(f) {
    serialport.list((err, ports) => {
      ports = ports.filter((p) => !p.comName.startsWith("/dev/ttyS"))
      f(ports)
    })
  }

  refreshPorts((ports) => {
    self.ports = ports.map((p) => p.comName);
    //debug(self.ports);
  })

  function detectNewPorts() {
    refreshPorts((ports) => {
      var ports_names = ports.map((p) => p.comName);
      var ports_new = _.difference(ports_names, self.ports)
      var ports_del = _.difference(self.ports, ports_names)
      self.ports = ports_names

      for (var i=0; i<ports_del.length; i++) {
        var port = ports_del[i]
        debug('vanished', chalk.yellow(port))
      }

      for (var i=0; i<ports_new.length; i++) {
        var port = ports_new[i]
        debug('discovered', chalk.yellow.bold(port))

        setTimeout(() => {
          var client = new serialport(port, opts)

          client.on('open', () => {
            client.destroy = function() {
              client.close()
            };
            client.syn_endpoint = "serial:" + port
            client.syn_direction = "out"
            self.emit('started', client)
          })
          client.on('error', (e) => {
            debug("Cannot open", port, ":", e);
          })
        }, 5000)
        return;
      }
    })
  }
  
  try {
    var usb = require('usb')

    usb.on('attach', (device) => {
      setTimeout(detectNewPorts, 100)
    })

    usb.on('detach', (device) => {
      setTimeout(detectNewPorts, 10)
    })
  } catch(e) {
    
  }

  setInterval(detectNewPorts, 10000);

  debug("waiting for devices")
}

util.inherits(SerialServer, events.EventEmitter);

module.exports = { SerialClient, SerialServer }
