/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const debug = require('debug')('Blynk:setup')

const builtin_exec = require('child_process').exec;
const fetch = require('node-fetch');

const { retry } = require('../utils.js')

//const request = require('request-promise-native') // TODO: use this

function exec(cmd, ignore_fail = false) {
  return new Promise(function(resolve, reject) {
    builtin_exec(cmd, function(err, stdout) {
      if (err && !ignore_fail) return reject(err);
      resolve(stdout);
    });
  });
}

/*
  let info = {
    product: "Product",
    ssid:    "my-ssid",
    pass:    "my-pass",
    auth:    "token",
    server:  "test.blynk.cc",
    port:    8441,
  }
*/

async function wifiSetup(info) {
  await exec(`nmcli connection delete "${info.product}"`, true)
  await exec(`nmcli dev wifi rescan ssid "${info.product}"`, true)

  try {
    debug(`Connecting to ${info.product}...`)
    try {
      await retry(() => {
        return exec(`nmcli dev wifi connect "${info.product}"`)
      }, 10, 1000)
    } catch(e) {
      throw new Error(`Cannot connect to AP: ${info.product}`)
    }

    // Get IP address
    let ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
    let gateway_ip = await retry(async () => {
      let res = await exec(`nmcli --fields=IP4.GATEWAY connection show "${info.product}"`)
      let ip = res.match(ipRegex);
      if (!ip) throw new Error(`Cannot get IP address of device ${info.product}`)
      return ip
    }, 5, 1000)
    debug(`Device IP: ${gateway_ip}`)

    // Fetch info
    let dev_info = await retry(() => fetch(`http://${gateway_ip}/board_info.json`).then(r => r.json()), 5, 1000)

    debug(JSON.stringify(dev_info, null, '  '));

    await retry(() => fetch(`http://${gateway_ip}/config?ssid=${info.ssid}&pass=${info.pass}&blynk=${info.auth}&host=${info.server}&port=${info.port}`), 5, 1000)
  } finally {
    debug('Disconnecting...');
    await exec(`nmcli connection delete "${info.product}"`, true)
  }

  return true;
}

module.exports = { wifiSetup }
