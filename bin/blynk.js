#!/usr/bin/env node

const yargs = require('yargs');

yargs.commandDir('../cmds').demandCommand(1, 'Please specify command to execute');

//yargs.count('verbose').alias('v', 'verbose');
//yargs.boolean('silent').alias('s', 'silent');


yargs.alias('h', 'help');
yargs.global('version', false);
yargs.completion('completion', false);
yargs.strict().wrap(Math.min(120, yargs.terminalWidth()));

//yargs.recommendCommands();

//yargs.interactive('i');

//yargs.group(['help', 'verbose', 'silent'], 'Global Arguments:');

let argv = yargs.argv;

/*
yargs.boolean('interactive').alias('i', 'interactive');


const inquirer = require('inquirer');

function runInquirer(cmd) {

    let commands = cmd.getCommandHandlers();

    inquirer.prompt({
      type: 'list',
      name: 'command',
      message: 'Select command',
      choices: [...Object.keys(commands)]
    }).then(result => {
      let handler = commands[result.command];
      handler.builder(yargs);
      runInquirer(yargs.getCommandInstance())
    })

}

if (argv.i) {
  runInquirer(yargs.getCommandInstance())
}
*/
