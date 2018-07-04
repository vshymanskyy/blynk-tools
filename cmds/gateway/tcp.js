const chalk = require('chalk');

module.exports = {
  command: 'tcp',
  describe: 'Redirect TCP connections to Blynk server',
  builder: (yargs) => {
    yargs
      .option({
        bind: {
          alias: 'b',
          type: 'string',
          default: '0.0.0.0',
          describe: 'Address to bind to',
          nargs: 1,
        },
        port: {
          alias: 'p',
          type: 'number',
          default: 8080,
          describe: 'Port to listen on',
          nargs: 1,
        },
      })
      .example('blynk gw tcp', 'Listen on port 8080, redirect all incoming connections to Blynk server')
      //.example('blynk gw tcp --connect="192.168.1.1:80"', 'Connect to specified address, redirect the connection to Blynk server') // TODO
  },
  handler: main
}

function main(argv) {
  console.log(JSON.stringify(argv))
}
