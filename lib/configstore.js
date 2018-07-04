/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const paths = require('env-paths')('blynk-tools', { suffix: '' })

fs.ensureDirSync(paths.config)

const configUserFn = path.join(paths.config, 'config.json')
const configBaseFn = path.join(__dirname, '..', 'config', 'default.json')

// Read defaults
const configBase = Object.freeze(fs.readJsonSync(configBaseFn))

// Read user overrides
let configUser = fs.readJsonSync(configUserFn, { throws: false }) || {}

let configFull = _.merge({}, configBase, configUser)

function set(name, value) {
  let prev = _.get(configUser, name)

  if (typeof value === 'object' && typeof prev === 'object') {
    _.set(configUser, name, _.merge({}, prev, value))
  } else {
    _.set(configUser, name, value)
  }

  // Cleanup default options
  configUser = difference(configUser, configBase)

  // Merge back (apply config)
  configFull = _.merge({}, configBase, configUser)

  // Save user config
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

module.exports = { set, get }
