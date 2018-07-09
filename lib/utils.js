/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const path = require('path')

function tryRequire(name) {
  let callerPath = path.dirname(callstack()[1].getFileName())
  let names = [ name, path.join(callerPath, name) ]
  for (let n of names) {
    try{
      return require(n);
    } catch(err) {
      if (err.code !== 'MODULE_NOT_FOUND') {
        console.log(err);
      }
    }
  }
  return undefined;
}


function tryLoad(paths, file, opts) {
  if (!Array.isArray(path)) {
    paths = [paths]
  }
  for (let p of paths) {
    try {
      let fn = path.join(p, file);
      return fs.readFileSync(fn, opts)
    } catch(e) {
    }
  }
  return undefined;
}

function callstack() {
  const _ = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  const stack = new Error().stack.slice(1);
  Error.prepareStackTrace = _;
  return stack;
}

function hexdump(data) {
  let result = '';
  let prevPrint = true;
  for (let i = 0; i < data.length; i++) {
    let c = data[i];
    if ((c > 31) && (c <  127)) {
      if (!prevPrint) result += ']';
      result += String.fromCharCode(c);
      prevPrint = true;
    } else {
      result += (prevPrint ? '[' : '|');
      if (c < 0x10) result += ('0');
      result += c.toString(16);
      prevPrint = false;
    }
  }
  if (!prevPrint) result += ']';
  return result;
}

module.exports = { tryRequire, tryLoad, hexdump };
