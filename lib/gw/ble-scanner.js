/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

var util = require('util')
var events = require('events')

var debug = require('debug')('BLE')
var chalk = require('chalk')

var BleRawSerial = require('./ble-serial.js')
var BleBeanSerial = require('./ble-serial-bluebean.js')

var dev_service_uuids = {
  '713d0000503e4c75ba943148f18d941e': {
    name : 'Nordic UART',
    create: BleRawSerial,
    options: {
      uuid_svc:'713d0000503e4c75ba943148f18d941e',
      uuid_tx: '713d0002503e4c75ba943148f18d941e', // notify
      uuid_rx: '713d0003503e4c75ba943148f18d941e'  // write
    }
  },
  '6e400001b5a3f393e0a9e50e24dcca9e': {
    name : 'Nordic UART',
    create: BleRawSerial,
    options: {
      uuid_svc:'6e400001b5a3f393e0a9e50e24dcca9e',
      uuid_tx: '6e400003b5a3f393e0a9e50e24dcca9e', // notify
      uuid_rx: '6e400002b5a3f393e0a9e50e24dcca9e'  // write
    }
  },
  'fff0': {
    name : 'Microduino',
    create: BleRawSerial,
    options: {
      uuid_svc:  'fff0',
      uuid_rxtx: 'fff6',
      max_chunk: 16
    }
  },
  'fe84': {
    name : 'Simblee',
    create: BleRawSerial,
    options: {
      uuid_svc:'fe84',
      uuid_tx: '2d30c082f39f4ce6923f3484ea480596', // notify
      uuid_rx: '2d30c083f39f4ce6923f3484ea480596'  // write
    }
  },
  "2220": {
    name : 'RFDuino BLE',
    create: BleRawSerial,
    options: {
      uuid_svc: '2220',
      uuid_tx:  '2221',
      uuid_rx:  '2222'
    }
  },
  'a495ff10c5b14b44b5121370f02d74de': {
    name : 'LightBlue Bean',
    create: BleBeanSerial,
    options: {
      uuid_svc:  'a495ff10c5b14b44b5121370f02d74de',
      uuid_rxtx: 'a495ff11c5b14b44b5121370f02d74de'
    }
  },
  'dfb0': {
    name : 'DFRobot',
    create: BleRawSerial,
    options: {
      uuid_svc:  'dfb0',
      uuid_rxtx: 'dfb1',
      uuid_cmd:  'dfb2',
      max_chunk: 16
    }
  },
  'ffe0': {
    name : 'HM-10',
    create: BleRawSerial,
    options: {
      uuid_svc:  'ffe0',
      uuid_rxtx: 'ffe1'
    }
  },
};

function BleScanner(opts) {
  var self = this;
  events.EventEmitter.call(this);

  var noble = require('noble');

  noble.on('discover', (peripheral) => {
    var name = peripheral.advertisement.localName;
    var uuid = peripheral.uuid;
    var addr = peripheral.address;
    var addrType = peripheral.addressType;
    var rssi = peripheral.rssi;
    debug('discovered %s [addr: %s (%s) uuid: %s, rssi: %d]', chalk.yellow.bold(name), chalk.yellow.bold(addr), addrType, uuid, rssi)


    peripheral.advertisement.serviceUuids.forEach((service) => {
      var svc = dev_service_uuids[service];
      if (svc !== undefined) {
        debug("device type:", svc.name)
        noble.stopScanning(() => {
          peripheral.connect((err) => {
            setTimeout(() => {
              noble.startScanning();
            }, 300)
            if (err) {
              debug(chalk.bgRed.bold("can't connect"))
              //console.error(err)
              return;
            }
            /*
            peripheral.on('rssiUpdate', (rssi) => {
              debug(name, 'rssi:', rssi)
            })
            setInterval(() => {
              peripheral.updateRssi()
            }, 2000)
            */

            var client = new svc.create(peripheral, svc.options);
            client.connect((err) => { // TODO: May not fire at all
              if (err) throw err;
              client.syn_endpoint = "ble:" + addr
              client.syn_direction = "out"
              self.emit('started', client)
            })

            peripheral.on('disconnect', () => {
              debug('vanished %s [addr: %s]', chalk.yellow(name), chalk.yellow(addr))
              client.emit('end')
            })
          })
        }) // stop scan
      }
    })
  })

  noble.on('stateChange', function(state) {
    debug('state changed to ' + state)
    if (state === 'poweredOn') {
      noble.startScanning(); // Object.keys(dev_service_uuids)
      debug('scanning for devices...')
    } else {
      noble.stopScanning();
    }
  })

  setTimeout(() => {
    if (noble.state === 'poweredOff') {
      debug(chalk.bgRed.bold("can't scan, adapter is " + noble.state))
    }
  }, 1000)
}

util.inherits(BleScanner, events.EventEmitter);


module.exports = { BleScanner };
