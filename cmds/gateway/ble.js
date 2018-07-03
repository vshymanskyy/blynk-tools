const chalk = require('chalk');
const gateway = require('../../lib/gateway.js')
const utils = require('../../lib/utils.js')
const noble = utils.tryRequire('noble');

module.exports = {
  command: chalk.blue.bold('ble'),
  describe: (noble ? 'Redirect Bluetooth LE connections to Blynk server' : chalk.red('[Bluetooth LE unavailable, need to install noble]')),
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
  console.log(JSON.stringify(argv))
}
