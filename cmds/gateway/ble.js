/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const chalk = require('chalk')
const utils = require('../../lib/utils.js')
const debug = require('debug')('BLE')

const SslClient = require('../../lib/gw/ssl-client.js')
const Ble = utils.tryRequire('../../lib/gw/ble-scanner.js')

module.exports = {
  command: 'ble',
  describe: 'Redirect Bluetooth LE connections to Blynk server' +
            (Ble ? '' : chalk.red(' [unavailable]')),
  builder: (yargs) => {
    yargs
      .option({
        name: {
          alias: 'n',
          type: 'string',
          describe: 'Name of BLE device to connect to',
          nargs: 1,
        },
        mac: {
          alias: ['address', 'addr'],
          type: 'string',
          describe: 'Address of BLE device to connect to',
          nargs: 1,
        },
      })
      .example('blynk gw ble', 'Scan for BLE devices, redirect connections to Blynk server')
  },
  handler: main
}

function main(argv) {

  if (!Ble) {
    console.log(`This command requires noble module to be installed.`);
    return;
  }
  
  let scanner = new Ble.BleScanner();
  scanner.on('started', function(bleConn) {
    var sslConn = new SslClient({ host: 'test.blynk.cc' });

    sslConn.connect(function() {
      let login = "\x02\x00\x01\x00\x20" + "5f7a98878c8946c78574a8883b427f4c";
      sslConn.write(login);
      bleConn.write(login);

      sslConn.pipe(bleConn);
      bleConn.pipe(sslConn);

      sslConn.on('end', function() {
        debug("SSL closed")
      })
      bleConn.on('end', function() {
        debug("BLE closed")
      })

    });
  })

  console.log(JSON.stringify(argv))
}
