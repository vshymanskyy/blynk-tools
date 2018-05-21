'use strict';

function infoParse(buff) {
  let arr = buff.toString('ascii').split('\0');
  let result = { _tag : arr[0] }
  arr = arr.slice(1, -2);
  for (let i=0; i<arr.length-1; i+=2) {
    result[arr[i]] = arr[i+1];
  }
  return result;
}

function infoFormat(obj) {
  let arr = [];
  obj = Object.assign({}, obj);
  arr.push(obj._tag);
  delete obj._tag;
  for (const [key, value] of Object.entries(obj)) {
    arr.push(key); arr.push(value);
  }
  arr.push('');
  arr.push('');
  return Buffer.from(arr.join('\0'), 'ascii');
}

function findTag(buff, tag) {
  let regex = new RegExp(tag + '\\x00[\\w\\s\\.,:\\-\\(\\)\\x00]*?\\x00\\x00');

  let match = regex.exec(buff.toString('ascii'));
  
  if (!match) return;

  return {
    offset: match.index,
    length: match[0].length,
    data:   Buffer.from(match[0], 'ascii')
  }
}

function writeTag(buff, tagInfo, newData) {
  if (newData.length > tagInfo.length) {
    throw new Error('New tag is too long to fit in place of existing tag')
  }
  buff.fill(0, tagInfo.offset, tagInfo.offset+tagInfo.length);
  newData.copy(buff, tagInfo.offset);
}

module.exports = { infoParse, infoFormat, findTag, writeTag };

/*
const fs = require('fs');

let input = fs.readFileSync('blnkinf.bin');

let tag = findTag(input, 'blnkinf');
console.log(`Offset: 0x${tag.offset.toString(16)}`);
console.log(`Length: ${tag.length}`);

fs.writeFileSync('blnkinf.tag', tag.data);

let info = infoParse(tag.data);


console.log(JSON.stringify(info, null, "  "));

let newInfo = {
  "_tag": "blnkinf",
  "ver": "2.0.0",
  "h-beat": "30",
  "buff-in": "256",
  "dev": "ESP8266",
  "build": "Jul 1 2018 11:22:33"
}

writeTag(input, tag, infoFormat(newInfo));
fs.writeFileSync('blnkinf.new.bin', input);
*/
