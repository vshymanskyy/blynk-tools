const fs = require('fs')
const config = require('../lib/configstore.js')

const JSON5 = require('json5')

module.exports = {
  command: 'config <name> [value]',
  describe: 'Set configuration',
  builder: (yargs) => {
    yargs
      .example('blynk config server', "Display default server config")
      .example('blynk config server.host test.com', "Set default server hostname")
      .example('blynk config server \'{host:"test.com"}\'', 'Set default server (JSON)')
      .example('blynk config device <auth>', 'Set default device')
      /*.positional('name', {
        describe: 'Parameter',
        type: 'string',
        hidden: true,
      })*/
  },
  handler: main
}

const parsers = [
  (val) => {
    if (['undefined', '<undefined>', 'null'].includes(val)) {
      return undefined
    }
    throw new Error()
  },
  (val) => JSON5.parse(val),
  (val) => val,
];

function getConfig(name) {
  let val = config.get(name);
  if (val === undefined) return "<undefined>";
  return JSON.stringify(val, null, 2);
}

function main(argv) {
  
  if (argv.value) {
    let value;
    
    for (let parse of parsers) {
      try {
        value = parse(argv.value);
        break;
      } catch(e) {}
    }

    config.set(argv.name, value)

    console.log(`New ${argv.name} value:`, getConfig(argv.name))
  } else {
    console.log(getConfig(argv.name))
  }

}
