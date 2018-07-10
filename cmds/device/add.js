/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const chalk = require('chalk')
const debug = require('debug')('Blynk')

const config = require('../../lib/configstore.js')

module.exports = {
  command: 'add [auth]',
  describe: 'Add a known Blynk device',
  builder: (yargs) => {
    yargs
      .option({
        auth: {
          alias: ['token', 't'],
          type: 'string',
          describe: 'Auth token',
          nargs: 1,
        },
      })
      .option({
        name: {
          alias: ['n'],
          type: 'string',
          describe: 'Device name (defaults to Project Title)',
          nargs: 1,
        },
      })
      .option({
        server: {
          type: 'string',
          default: config.get('default.server') || 'Blynk',
          describe: 'Server name',
          nargs: 1,
        },
      })
      .demandOption(['server', 'auth'])
      .example('$0 device add e081fa2a03f243398c761c81aec60712 --name=Device1', 'Register a device')
  },
  handler: main
}

async function main(argv) {
  const Spinner = require('cli-spinner').Spinner
  const request = require('request-promise-native')
  const _ = require('lodash')

  if (!_.isError(_.attempt(x => config.findDevice(argv.auth)))) {
    throw new Error(`Device with token ${argv.auth} is already registered`);
  }

  const server = config.findServer(argv.server);
  const rejectUnauthorized = !server['http-api-insecure'];

  let spinner = new Spinner(chalk.cyan.bold('%s') + '  Adding device...');
  spinner.start();

  let project = await request({
    uri: `${server.url}/${argv.auth}/project`,
    json: true,
    rejectUnauthorized,
  });

  let isConnected = await request({
    uri: `${server.url}/${argv.auth}/isHardwareConnected`,
    json: true,
    rejectUnauthorized,
  });

  spinner.stop(true);

  let device = {
    auth: argv.auth,
    name: argv.name || project.name,
    server: server.name,
  }

  if (!_.isError(_.attempt(x => config.findDevice(device.name)))) {
    throw new Error(`Device with name ${device.name} is already registered`);
  }

  let devices = config.get('devices') || [];
  devices.push(device);
  config.set('devices', devices);

  console.log(isConnected ? chalk.green.bold('●') : '○', '', device.name);
}
