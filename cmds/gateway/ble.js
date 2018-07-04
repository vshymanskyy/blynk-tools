const chalk = require('chalk');
const utils = require('../../lib/utils.js')

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

  console.log(JSON.stringify(argv))
}
