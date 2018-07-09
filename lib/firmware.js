/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const JSON5 = require('json5')

class TagBinary {

  static find(buff, tag) {
    let regex = new RegExp(tag + '\\x00[\\w\\s\\.,:\\-\\(\\)\\x00]*?\\x00\\x00');

    let match = regex.exec(buff.toString('ascii'));

    if (!match) return;

    let result = new TagBinary();
    result.format = 'binary';
    result.tag    = tag;
    result.source = buff;
    result.offset = match.index;
    result.length = match[0].length;
    result.info   = TagBinary.parse(Buffer.from(match[0], 'ascii'));
    return result;
  }

  static parse(buff) {
    let arr = buff.toString('ascii').split('\0');
    let result = {}
    arr = arr.slice(1, -2);
    for (let i=0; i<arr.length-1; i+=2) {
      result[arr[i]] = arr[i+1];
    }
    return result;
  }

  static format(tag, info) {
    let arr = [ tag ];
    for (const [key, value] of Object.entries(info)) {
      arr.push(key); arr.push(value);
    }
    arr.push('');
    arr.push('');
    return Buffer.from(arr.join('\0'), 'ascii');
  }

  write(obj) {
    const newData = TagBinary.format(this.tag, obj);

    if (newData.length > this.length) {
      throw new Error('New tag is too long to fit in place of existing tag')
    }

    let res = Buffer.from(this.source);
    res.fill(0, this.offset, this.offset+this.length);
    newData.copy(res, this.offset);
    return res;
  }

}

class TagJSON {

  static find(buff, tag) {
    let regex = new RegExp(tag + `={[\\w\\s\\.,:"'\\-\\(\\)]*?}`);

    let match = regex.exec(buff.toString('utf8'));

    if (!match) return;

    let result = new TagJSON();
    result.format = 'json';
    result.tag    = tag;
    result.source = buff;
    result.offset = match.index;
    result.length = match[0].length;
    result.info   = JSON5.parse(match[0].substring(match[0].indexOf('{')));

    return result;
  }

  static format(tag, info) {
    return Buffer.from(tag + "=" + JSON.stringify(info), 'utf8');
  }

  write(obj) {
    const newData = TagJSON.format(this.tag, obj);

    return Buffer.concat([
      this.source.slice(0, this.offset),
      newData,
      this.source.slice(this.offset+this.length)
    ]);
  }
}

function findTag(buff, tag) {
  for (let format of [ TagBinary, TagJSON ]) {
    try {
      let res = format.find(buff, tag);
      if (res) return res;
    } catch(e) {
    }
  }
}

module.exports = { findTag, TagBinary, TagJSON };

/*
const fs = require('fs');

let input = fs.readFileSync('blnkinf.bin');

let tag = findTag(input, 'blnkinf');
console.log(`Offset: 0x${tag.offset.toString(16)}`);
console.log(`Length: ${tag.length}`);

fs.writeFileSync('blnkinf.tag', tag.data);

console.log(JSON.stringify(tag.info, null, "  "));

let newInfo = {
  "ver": "2.0.0",
  "h-beat": "30",
  "buff-in": "256",
  "dev": "ESP8266",
  "build": "Jul 1 2018 11:22:33"
}

let output = tag.write(newInfo);
fs.writeFileSync('blnkinf.new.bin', output);
*/
