/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const chalk = require('chalk');
const utils = require('../../lib/utils.js')

const SslClient = require('../../lib/gw/ssl-client.js')
const Serial = utils.tryRequire('../../lib/gw/serial.js')

module.exports = {
  command: 'serial',
  describe: 'Redirect Serial/USB connections to Blynk server' +
            (Serial ? '' : chalk.red(' [unavailable]')),
  builder: (yargs) => {
    yargs
      .option({
        port: {
          alias: 'p',
          type: 'string',
          describe: 'Serial port to connect to',
          nargs: 1,
        },
        baud: {
          alias: ['b'],
          default: 57600,
          type: 'number',
          describe: 'Baudrate',
          nargs: 1,
        },
      })
      .example('$0 gw serial --port=/dev/ttyUSB0', 'Redirect serial connection to Blynk server')
  },
  handler: main
}

function main(argv) {
  
  if (!Serial) {
    console.log(`This command requires serialport module to be installed.`);
    return;
  }

  console.log(JSON.stringify(argv))
}
