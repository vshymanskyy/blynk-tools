module.exports = {
  command: 'device <command>',
  describe: 'Device management',
  builder: (yargs) => yargs.commandDir('device')
}
