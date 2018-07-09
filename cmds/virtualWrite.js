/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const _ = require('lodash')
const chalk = require('chalk')
const debug = require('debug')('Blynk')
const request = require('request-promise-native')

const { tryParse } = require('../lib/utils.js')
const config = require('../lib/configstore.js')

module.exports = {
  command: ['virtualWrite <pin> <value>', 'vw'],
  describe: 'Set virtual pin value',
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
      .example('$0 vw V0 123', 'Set pin V0 to 123')
  },
  handler: main
}

async function main(argv) {
  let value = tryParse(argv.value);

  if (_.isArray(value)) {
    // good.
  } else if (_.isNumber(value) || _.isString(value)) {
    value = [value]
  } else {
    throw new Error(`Value ${argv.value} is not supported`)
  }
  value = JSON.stringify(value);
  debug('Value:', value);

  const device = config.findDevice(argv.device);
  const server = config.findServer(device.server);
  const rejectUnauthorized = !server['http-api-insecure'];

  let url = `${server.url}/${device.auth}/update/${argv.pin}`;
  debug('URL:', url);

  let res = await request({
    method: 'PUT',
    uri: url,
    body: value,
    headers: {
      'Content-Type': 'application/json'
    },
    rejectUnauthorized,
  });

  /*let url = `${server.url}/${device.auth}/update/${argv.pin}?value=${argv.value}`;
  debug('URL:', url);

  let res = await request({
    uri: url,
    body: value,
    headers: {
      'Content-Type': 'application/json'
    },
    rejectUnauthorized,
  });*/

  /*res = await request({
    uri: `${server.url}/${device.auth}/get/${argv.pin}`,
    rejectUnauthorized,
  });*/

  //if (res === "") {
    console.log(`${argv.pin} set to ${value}`)
  //}
}
