/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const debug = require('debug')('Blynk:config')
const { tryParse, dirs } = require('./utils.js')

const configUserFn = path.join(dirs.config, 'config.json')
const configBaseFn = path.join(__dirname, '..', 'config', 'default.json')

// Read defaults
const configBase = Object.freeze(fs.readJsonSync(configBaseFn))

// Read user overrides
let configUser;
try {
  configUser = tryParse(fs.readFileSync(configUserFn))
  
  if (!_.isObjectLike(configUser)) {
    console.log(`Could not load ${configUserFn} (invalid format?)`)
    process.exit(1)
  }
} catch(e) {
  configUser = {}
}

let configFull = _.merge({}, configBase, configUser)

function set(name, value) {
  let prev = _.get(configUser, name)

  if (_.isArray(value) && _.isArray(prev)) {
    _.set(configUser, name, value)
  } else if (_.isObjectLike(value) && _.isObjectLike(prev)) {
    _.set(configUser, name, _.merge({}, prev, value))
  } else {
    _.set(configUser, name, value)
  }

  // Cleanup default options
  configUser = difference(configUser, configBase)

  // Merge back (apply config)
  configFull = _.merge({}, configBase, configUser)

  // Save user config
  try {
    fs.renameSync(configUserFn, configUserFn + '.bak');
  } catch(e) {}
  fs.writeJsonSync(configUserFn, configUser, { spaces: 2 })
}

function get(name) {
  return _.get(configFull, name)
}

function difference(object, base) {
  function changes(object, base) {
    return _.transform(object, function(result, value, key) {
      if (!_.isEqual(value, base[key])) {
        result[key] = (_.isObject(value) && _.isObject(base[key])) ? changes(value, base[key]) : value;
      }
    });
  }
  return changes(object, base);
}

function findDevice(name) {
  let devices = Object.entries(get('devices'))
      .filter(x => x[0] === name || x[1].auth === name)
      .map(x => x[1]);

  if (!devices.length)    throw new Error(`Device "${name}" not found`);
  if (devices.length > 1) throw new Error(`Multiple devices found for "${name}"`);

  const device = devices[0];
  debug('Device:', device);
  return device;
}

function newDeviceName() {
  let devices = get('devices');

  for (let i=1; ; i++) {
    let name = `Device ${i}`;
    if (!devices[name])
      return name;
  }
}

function findServer(name) {
  let server = get('servers')[name];
  if (!server)    throw new Error(`Server "${name}" not found`);

  server = Object.assign({}, get('servers._default'), server)

  server.url = server['http-api-url'].replace('${host}', server.host);
  if (server.url.endsWith('/')) server.url = server.url.slice(0, -1);

  debug('Server:', server);
  return server;
}

module.exports = { set, get, findServer, findDevice, newDeviceName }
