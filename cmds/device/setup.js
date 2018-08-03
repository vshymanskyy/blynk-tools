/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const chalk = require('chalk')
const debug = require('debug')('Blynk')

const config = require('../../lib/configstore.js')
const { tryRequire, Spinner } = require('../../lib/utils.js')
const WiFiSetup = tryRequire('../../lib/wifi-setup')

module.exports = {
  command: 'setup <AP>',
  describe: 'Provision Blynk device WiFi credentials' +
            (WiFiSetup ? '' : chalk.red(' [unavailable]')),
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
        ssid: {
          type: 'string',
          describe: 'WiFi config: SSID (Access Point name)',
          nargs: 1,
        },
        pass: {
          type: 'string',
          describe: 'WiFi config: password',
          nargs: 1,
        },
      })
      .demandOption(['device'])
      .example('$0 device setup "Device WiFi AP" --device=Device1 --ssid="My Home WiFi" --pass="my_pass"', 'Setup a device')
  },
  handler: main
}

async function main(argv) {

  if (!WiFiSetup) {
    console.error(`Sorry, this command is not available on your OS yet.`);
    process.exit(1);
  }

  const device = config.findDevice(argv.device);
  const server = config.findServer(device.server);

  let spinner = new Spinner(chalk.cyan.bold('%s') + '  Setting up...');
  spinner.start();

  try {
    let result = await WiFiSetup.wifiSetup({
      product: argv.AP,
      ssid:    argv.ssid,
      pass:    argv.pass,
      auth:    device.auth,
      server:  server['host'],
      port:    server['hw-port-tcp'],
    });
    
    
    console.log('\rProvisioning complete. Device should appear online.');
  } catch(e) {
    console.log('\rProvisioning failed:', e.message);
  } finally {
    spinner.stop();
  }
  
}
