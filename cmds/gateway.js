module.exports = {
  command: 'gateway <command>',
  describe: 'Connect devices to Blynk Cloud',
  aliases: ['gw','connect'],
  builder: (yargs) => yargs.commandDir('gateway')
}
