const fs = require('fs')
const firmware = require('../../lib/firmware.js')

module.exports = {
  command: 'info <firmware>',
  describe: 'Shows and extracts info tags',
  builder: (yargs) => {
    yargs
      .option({
        tag: {
          type: 'string',
          default: 'blnkinf',
          describe: 'Tag name',
          nargs: 1,
        },
        format: {
          alias: 'fmt',
          choices: ['json', 'binary'],
          default: 'json',
          describe: 'Output format',
          nargs: 1,
        },
        output: {
          alias: 'o',
          describe: 'File to output to',
          type: 'string',
          nargs: 1,
        },
      })
      .example('blynk fw info ./firmware.bin', 'Show info tag')
      .example('blynk fw info ./firmware.bin --tag=blnkopt', 'Show custom tag')
      .example('blynk fw info ./firmware.bin --fmt=binary -o ./firmware.tag', 'Extract info tag in binary format')

      /*.positional('firmware', {
        describe: 'Input firmware file',
        type: 'string',
        hidden: true,
      })*/
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

  let result;
  if (argv.format == 'json') {
    result = JSON.stringify(tag.info, null, '  ');
  } else if (argv.format == 'binary') {
    result = firmware.TagBinary.format(argv.tag, tag.info);
  }
  if (argv.output) {
    fs.writeFileSync(argv.output, result);
  } else {
    console.log(result);
  }
}
