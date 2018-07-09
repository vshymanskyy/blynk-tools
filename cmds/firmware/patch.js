/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const fs = require('fs')
const firmware = require('../../lib/firmware.js')

module.exports = {
  command: 'patch <firmware>',
  describe: 'Patch command allows updating an existing info tag in-place, overwriting some values',
  builder: (yargs) => {
    yargs
      .strict(false)
      .option({
        tag: {
          type: 'string',
          default: 'blnkinf',
          describe: 'Tag name',
          nargs: 1,
        },
        output: {
          alias: 'o',
          describe: 'File to output to',
          type: 'string',
          demandOption: 'Please specify output file',
          nargs: 1,
        },
      })
      .example('blynk fw patch ./firmware.bin -o ./provisioned.bin --tag="blnkopt" --ssid="" --pass="" --auth=""')
  },
  handler: main
}

function main(argv) {
  //console.log(JSON.stringify(argv))

  let input = fs.readFileSync(argv.firmware);

  let tag = firmware.findTag(input, argv.tag);
  if (!tag) {
    console.error(`Tag '${argv.tag}' not found in ${argv.firmware}`);
    process.exit(1);
  }

  console.log(`Format: ${tag.format}`);
  console.log(`Offset: 0x${tag.offset.toString(16)}`);
  console.log(`Length: ${tag.length}`);

  let info = tag.info;

  //console.log(JSON.stringify(info, null, '  '));

  for (const [key, value] of Object.entries(info)) {
    if (argv.hasOwnProperty(key)) {
      console.log(`${key}: ${value} => ${argv[key]}`);
      info[key] = argv[key]
    }
  }

  //console.log(JSON.stringify(info, null, '  '));

  let output = tag.write(info);

  fs.writeFileSync(argv.output, output);
}
