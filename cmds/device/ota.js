/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const chalk = require('chalk')
const debug = require('debug')('Blynk')

const config = require('../../lib/configstore.js')

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
      })
      .demandOption(['device'])
      .example('$0 device ota --device=Device1 firmware.bin', 'Flash firmware to Device1')
  },
  handler: main
}

async function main(argv) {
  
  const fs = require('fs')
  const firmware = require('../../lib/firmware.js')

  let input = fs.readFileSync(argv.firmware);

  let tag = firmware.findTag(input, 'blnkinf');
  if (tag) {
    debug(`Metainfo: ${ JSON.stringify(tag.info) }`);
  } else {
    debug(`Tag 'blnkinf' not found in ${argv.firmware}`);
  }

  const device = config.findDevice(argv.device);
  const server = config.findServer(device.server);
  const rejectUnauthorized = !server['http-api-insecure'];

  const request = require('request-promise-native');

  const Spinner = require('cli-spinner').Spinner;
  let spinner = new Spinner(chalk.cyan.bold('%s') + '  OTA firmware update...');
  spinner.start();

  // TODO: This URL should be normalized with other HTTP API
  let url = `${server.url}/admin/ota/start?token=${device.auth}`;
  debug('URL:', url);

  let res = await request({
    method: 'POST',
    uri: url,
    auth: {
      user: 'admin@blynk.cc', // TODO: use server config
      pass: 'admin',
    },
    formData: {
      file: {
        value:  input,
        options: {
          filename: 'firmware',
          contentType: 'application/octet-stream'
        }
      },
      metainfo: tag ? JSON.stringify(tag.info) : undefined
    },
    rejectUnauthorized,
  });

  spinner.stop();
  
  console.log('\rOTA initiated.');
}
