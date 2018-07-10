/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const chalk = require('chalk')
const debug = require('debug')('Blynk')

const config = require('../lib/configstore.js')

module.exports = {
  command: ['virtualRead <pin>', 'vr'],
  describe: 'Read last virtual pin value',
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
      })
      .demandOption(['device'])
      .example('$0 vw V0', 'Read pin V0')
  },
  handler: main
}

async function main(argv) {
  const request = require('request-promise-native')
  const { tryParse } = require('../lib/utils.js')

  const device = config.findDevice(argv.device);
  const server = config.findServer(device.server);
  const rejectUnauthorized = !server['http-api-insecure'];

  let url = `${server.url}/${device.auth}/get/${argv.pin}`;
  debug('URL:', url);

  let res = await request({
    uri: url,
    rejectUnauthorized,
  });

  if (res.indexOf('\0') >= 0) {
    console.log(JSON.stringify(res.slice(2,-2).split('\0').map(tryParse)))
  } else {
    console.log(JSON.stringify(JSON.parse(res).map(tryParse)));
  }
}
