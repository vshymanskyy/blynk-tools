/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const debug = require('debug')('Blynk:setup')
const { retry, exec, delay } = require('../utils.js')

const request = require('request-promise-native')

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
  await exec(`nmcli connection delete "${info.product}"`, { ignore_fail: true })
  await delay(1000);

  await exec(`nmcli dev wifi rescan ssid "${info.product}"`, { ignore_fail: true })

  try {
    debug(`Connecting to ${info.product}...`)
    try {
      await retry(() => {
        return exec(`nmcli dev wifi connect "${info.product}"`, { timeout: 30000 })
      }, 10, 1000)
    } catch(e) {
      await exec(`nmcli connection delete "${info.product}"`, { ignore_fail: true })
      await delay(1000);
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
    let dev_info = await retry(() => request(`http://${gateway_ip}/board_info.json`, { timeout: 10000, json: true }), 5, 1000)

    debug(JSON.stringify(dev_info, null, '  '));

    let config_url = `http://${gateway_ip}/config?ssid=${info.ssid}&pass=${info.pass}&blynk=${info.auth}&host=${info.server}&port=${info.port}&port_ssl=${info.port_ssl}`;
    try {
      debug(`Request: ${config_url}`);
      await retry(() => request(config_url, { timeout: 3000 }), 5, 1000)
    } catch (e) {}

  } finally {
    debug('Disconnecting...');

    await exec(`nmcli connection delete "${info.product}"`, { ignore_fail: true })
  }

  return true;
}

module.exports = { wifiSetup }
