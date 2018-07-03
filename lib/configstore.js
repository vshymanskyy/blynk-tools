'use strict';

const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const paths = require('env-paths')('blynk-tools', { suffix: '' })

fs.ensureDirSync(paths.config)

const configUserFn = path.join(paths.config, 'config.json')
const configBaseFn = path.join(__dirname, '..', 'config', 'default.json')

// Read defaults
const configFull = fs.readJsonSync(configBaseFn, { throws: false })
// Extend with user overrides
const configUser = fs.readJsonSync(configUserFn, { throws: false }) || {}
_.merge(configFull, configUser)

function saveConfig() {
  fs.writeJsonSync(configUserFn, configUser, { spaces: 2 })
}

function set(name, value) {
  if (typeof value === 'string' || value instanceof String) {
    configUser[name] = value
  } else if (typeof value === 'object') {
    configUser[name] = _.merge({}, configUser[name], value)
  }
  _.merge(configFull, configUser)
  saveConfig()
}

function get(name) {
  return configFull[name]
}

module.exports = { set, get }
