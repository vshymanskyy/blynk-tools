/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const debug_exec = require('debug')('Blynk:utils:exec')
const os = require('os')
const path = require('path')
const fs = require('fs-extra')

const builtin_exec = require('child_process').exec;
const JSON5 = require('json5')

const dirs = require('env-paths')('blynk-tools', { suffix: '' })
fs.ensureDirSync(dirs.config)
fs.ensureDirSync(dirs.temp)

const debug = require('debug')('Blynk:utils')

const Spinner = require('cli-spinner').Spinner;
Spinner.setDefaultSpinnerString(19);
Spinner.setDefaultSpinnerDelay(100);

// Disable spinner if debug is on
if (process.env.DEBUG) {
  Spinner.prototype.start = function() {}
}

function isDeviceAuthToken(str) {
  return /^([a-fA-F0-9]{32,})$/.test(str);
}

function tryRequire(name) {
  let callerPath = path.dirname(callstack()[1].getFileName())
  let names = [ name, path.join(callerPath, name) ]
  for (let n of names) {
    try{
      return require(n);
    } catch(err) {
      if (err.code !== 'MODULE_NOT_FOUND') {
        debug(err);
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

const parsers = [
  (val) => {
    if (['undefined', '<undefined>'].includes(val)) {
      return undefined
    }
    throw new Error()
  },
  (val) => JSON.parse(val),
  (val) => JSON5.parse(val)
];

function tryParse(str) {
  for (let parse of parsers) {
    try {
      return parse(str);
    } catch(e) {}
  }
  return str;
}

function callstack() {
  const _ = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  const stack = new Error().stack.slice(1);
  Error.prepareStackTrace = _;
  return stack;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function retry(handler, retries=3, gap=0) {
  let lastError;
  for (let i = 0; i <= retries; i++) {
    try {
      return await handler();
    } catch(err) {
      lastError = err;
      if (gap) { await delay(gap) }
    }
  }
  throw lastError;
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

function exec(cmd, opts) {
  return new Promise(function(resolve, reject) {
    debug_exec('Running:', cmd);
    opts = Object.assign({
      ignore_fail: false,
      timeout: 5000,
    }, opts);
    switch (os.platform()) {
      case 'linux':
        opts.env = Object.assign({}, process.env, { LANG: 'en', LC_ALL: 'en', LC_MESSAGES: 'en' });
        break;
      case 'win32':
        cmd = 'chcp 65001 >NUL && ' + cmd;
        break;
    }

    builtin_exec(cmd, opts, function(err, stdout, stderr) {
      if (err && !opts.ignore_fail) {
        debug_exec('Error:', stderr.trim(), stdout.trim());
        return reject(err);
      }
      debug_exec(stdout.trim());
      resolve(stdout);
    });
  });
}

module.exports = { isDeviceAuthToken, tryRequire, tryLoad, tryParse, hexdump, delay, retry, exec, dirs, Spinner };
