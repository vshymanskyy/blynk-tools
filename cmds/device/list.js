/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const chalk = require('chalk')
const debug = require('debug')('BLE')

const Table = require('cli-table-redemption');

module.exports = {
  command: 'list',
  describe: 'List registered Blynk devices',
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
      .example('$0 device add', 'Add device')
  },
  handler: main
}

function main(argv) {
  var table = new Table({ chars: {'mid': '', 'left-mid': '', 'mid-mid': '', 'right-mid': ''} });
  table.push(
      ['foo', 'bar', 'baz'],
      ['frobnicate', 'bar', 'quuz']
  );
  
  console.log(table.toString());
}
