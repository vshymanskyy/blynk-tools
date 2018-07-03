const chalk = require('chalk');
const gateway = require('../../lib/gateway.js')
const utils = require('../../lib/utils.js')
const serial = utils.tryRequire('serialport');

module.exports = {
  command: chalk.blue.bold('serial'),
  describe: (serial ? 'Redirect Serial/USB connections to Blynk server' : chalk.red(' [Serial/USB unavailable, need to install serialport]')),
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
      .example('blynk gw serial --port=/dev/ttyUSB0', 'Redirect serial connection to Blynk server')
  },
  handler: main
}

function main(argv) {
  console.log(JSON.stringify(argv))
}
