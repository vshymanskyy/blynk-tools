/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const chalk = require('chalk')
const debug = require('debug')('Blynk')

const api = require('../../lib/api.js')
const config = require('../../lib/configstore.js')
const { Spinner } = require('../../lib/utils.js')

module.exports = {
  command: 'ota <firmware>',
  describe: 'Perform device OTA update',
  builder: (yargs) => {
    yargs
      .option({
        device: {
          alias: ['d'],
          type: 'string',
          default: config.get('default.device'),
          describe: 'Registered device name or auth token',
          nargs: 1,
        },
        secure: {
          type: 'boolean',
          default: true,
        }
      })
      .demandOption(['device'])
      .example('$0 device ota --device=Device1 firmware.bin', 'Flash firmware to Device1')
  },
  handler: main
}

async function main(argv) {

  const device = config.findDevice(argv.device);
  const server = config.findServer(device.server);

  let spinner = new Spinner(chalk.cyan.bold('%s') + '  OTA firmware update...');
  spinner.start();

  // Login
  const jar = await api.getSessionCookieJar(server, "admin@blynk.cc", "admin");

  // Start OTA
  const res = await api.startOTA(server, device, jar, argv.firmware, { isSecure: argv.secure });

  spinner.stop();

  //console.log("Result:", res);
  console.log('\rOTA started.                           ');
}
