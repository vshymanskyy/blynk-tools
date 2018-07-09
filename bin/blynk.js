#!/usr/bin/env node

/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const debug = require('debug')('Blynk')
const yargs = require('yargs');
const Spinner = require('cli-spinner').Spinner;

Spinner.setDefaultSpinnerString(19);
Spinner.setDefaultSpinnerDelay(100);


process.on('unhandledRejection', (reason, promise) => {
  console.error(reason)
  process.exit(1)
})

process.on('uncaughtException', (err) => {
  console.error(err.message)
  process.exit(1)
})

yargs.commandDir('../cmds').demandCommand(1, 'Please specify command to execute');

//yargs.count('verbose').alias('v', 'verbose');
//yargs.boolean('silent').alias('s', 'silent');

yargs.epilog('Copyright 2017 Volodymyr Shymanskyy')
yargs.alias('h', 'help');
yargs.global('version', false);
yargs.completion('completion', false);
yargs.strict().wrap(Math.min(120, yargs.terminalWidth()));

yargs.fail(function(msg, err, yargs) {
  if (err) {
    debug(err)
    console.error(err.message)
  } else {
    console.error(yargs.help())
    console.error(msg)
  }
  process.exit(1)
})

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
