/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const chalk = require('chalk')
const debug = require('debug')('BLE')

const request = require('request-promise-native')
const Table = require('cli-table-redemption');
const Spinner = require('cli-spinner').Spinner;

const config = require('../../lib/configstore.js')

module.exports = {
  command: 'list',
  describe: 'List registered Blynk devices',
  builder: (yargs) => {
    yargs
      .example('$0 device list')
  },
  handler: main
}

async function main(argv) {
  var table = new Table({
    head: ['Status', 'Name', 'Server', 'Token'],
    style : { compact : true, 'padding-left' : 1, head: ['cyan', 'bold'] }
  });

  let devices = config.get('devices');

  if (!devices.length) {
    throw new Error(`No registered devices.\nYou can add a device using "blynk device add" command.`);
  }

  let defaultDevice;
  try {
    defaultDevice = config.findDevice(config.get('default.device'))
  } catch(e) {}

  let spinner = new Spinner(chalk.cyan.bold('%s') + '  Refreshing device status...');
  spinner.start();
  
  for (let d of devices) {
    
    const server = config.findServer(d.server);
    const rejectUnauthorized = !server['http-api-insecure'];

    let isDefault = defaultDevice && (defaultDevice.auth === d.auth);
    let isConnected = await request({
      uri: `${server.url}/${d.auth}/isHardwareConnected`,
      json: true,
      rejectUnauthorized,
    });

    let status = '';
    status += isConnected ? chalk.green.bold('●') : '○';
    status += isDefault ? chalk.cyan.bold('  ⇨') : '';
    table.push([status, d.name, d.server, '...' + d.auth.slice(-6)])
  }

  spinner.stop();

  console.log('\r' + table.toString());
}
