/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const config = require('../lib/configstore.js')
const { tryParse } = require('../lib/utils.js')

module.exports = {
  command: 'config <name> [value]',
  describe: 'Set configuration',
  builder: (yargs) => {
    yargs
      .example('$0 config default.server', "Display default server")
      .example('$0 config default.device', "Display default device")
      .example('$0 config default.server Blynk',    "Set default server name/hostname")
      .example('$0 config default.device CoolDev1', "Set default device name/auth")
  },
  handler: main
}

function getConfig(name) {
  let val = config.get(name);
  if (val === undefined) return "<undefined>";
  return JSON.stringify(val, null, 2);
}

function main(argv) {
  
  if (argv.value) {
    let value = tryParse(argv.value);

    config.set(argv.name, value)

    console.log(`New ${argv.name} value:`, getConfig(argv.name))
  } else {
    console.log(getConfig(argv.name))
  }

}
