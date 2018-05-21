module.exports = {
  command: 'firmware <command>',
  describe: 'Firmware binaries processing',
  aliases: ['fw'],
  builder: (yargs) => yargs.commandDir('firmware')
}
