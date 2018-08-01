/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';


/*

  *** AP mode ***
  netsh wlan stop hostednetwork interface="Wi-Fi 2"
  netsh wlan set hostednetwork mode=allow ssid=NEW_Sid key=New_Password keyUsage=temporary
  netsh wlan start hostednetwork interface="Wi-Fi 2"

 */

const debug = require('debug')('Blynk:setup')
const { retry, exec, delay, dirs } = require('../utils.js')
const fs = require('fs')
const path = require('path')

const request = require('request-promise-native')

let iface = '';

function pairs_to_object(pairs) {
    var ret = {};
    pairs.forEach(function (p) { ret[p[0]] = p[1]; });
    return ret;
}

async function getInterfaces() {
  let result = await exec(`netsh wlan show interfaces`);
  result = result.split(/\s+Name\s+:/)
                  .splice(1)
                  .map(x => ("  Name : " + x)
                            .split(/[\r\n]/)
                            .map(x => x.split(/\s+:\s/)
                                      .map(x => x.trim())
                            ).filter(x => x[1] !== undefined)
                  ).map(pairs_to_object);

  return result;
}

async function scanNetworks(iface) {
  let result = await exec(`netsh wlan show networks ${iface} mode=BSSID`);
  result = result.split(/\s+SSID\s+\d+\s+:/)
                  .splice(1)
                  .map(x => ("  SSID : " + x)
                            .split(/[\r\n]/)
                            .map(x => x.split(/\s+:\s/)
                                      .map(x => x.trim())
                            ).filter(x => x[1] !== undefined)
                  ).map(pairs_to_object);
                  
  return result;
}

async function getPass(profile) {
  let result = await exec(`netsh wlan show profile ${iface} name="${profile}" key=clear | findstr /C:"Key Content"`);
  result = result.split(/\s+:\s+/)
  if (result.length !== 2)
    return undefined;

  return result[1].replace(/[\r\n]*$/, '');
}

async function connectWiFi(ssid, security, key) {
  security = security || "open";
  security = security.toLowerCase();
  
  let authentication, encryption;
  if (security === 'none' || security === "open") {
    authentication = 'open'
    encryption = 'none'
  } else if (security.includes('wpa')) {
    authentication = 'WPAPSK'
    encryption = 'TKIP'
  } else if (security.includes('wpa2')) {
    authentication = 'WPA2PSK'
    encryption = 'AES'
  } else {
    throw new Error('Invalid security type')
  }

  let profile = `<?xml version="1.0"?>
<WLANProfile xmlns="http://www.microsoft.com/networking/WLAN/profile/v1">
  <name>${ssid}</name>
  <SSIDConfig>
    <SSID>
      <name>${ssid}</name>
    </SSID>
  </SSIDConfig>
  <connectionType>ESS</connectionType>
  <connectionMode>auto</connectionMode>
  <MSM>
    <security>
      <authEncryption>
        <authentication>${authentication}</authentication>
        <encryption>${encryption}</encryption>
        <useOneX>false</useOneX>
      </authEncryption>
    </security>
  </MSM>
  <MacRandomization xmlns="http://www.microsoft.com/networking/WLAN/profile/v3">
    <enableRandomization>false</enableRandomization>
    <randomizationSeed>1780422416</randomizationSeed>
  </MacRandomization>
</WLANProfile>`;

  let profileFn = path.join(dirs.temp, 'profile.xml');
  debug('Writing WiFi profile:', profileFn);
  fs.writeFileSync(profileFn, profile)
  try {
    await exec(`netsh wlan add profile ${iface} filename="${profileFn}"`)
  } finally {
    fs.unlinkSync(profileFn)
  }

  // Set key using a separate command so it doesn't get stored on the file system
  if (authentication !== 'open') {
    if (!key) {
      throw new Error('Key is required for protected networks')
    }
    await exec(`netsh wlan set profileparameter ${iface} name="${ssid}" keyType="passPhrase" keyMaterial="${key}"`);
  }

  await exec(`netsh wlan connect ${iface} name="${ssid}" ssid="${ssid}"`);
};

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
  let networks = [];
  let interfaces = await getInterfaces();
  let connectedIf = interfaces.filter(x => x.State === 'connected' && x.Profile)
  
  const selectedIf = connectedIf[0] || interfaces[0]
  if (selectedIf) {
    debug (`Using WiFi adapter: ${selectedIf.Name}`);
    iface = `i="${selectedIf.Name}"`
    if (selectedIf.Profile) {
      debug (`Currently connected to: ${selectedIf.Profile}`);
      //let pass = await getPass(selectedIf.Profile);
      //debug (`Password: ${pass}`);
    }
    networks = await scanNetworks(selectedIf.Name);
  }

  const deviceNetworks = networks.filter(x => x.SSID === info.product);
  
  if (!deviceNetworks.length) {
    throw new Error(`Network ${info.product} not found`);
  }
  
  try {
    debug(`Connecting to ${info.product}...`)
    try {
      await retry(() => connectWiFi(info.product), 5, 1000)
    } catch(e) {
      throw new Error(`Cannot connect to AP: ${info.product}`)
    }
    await delay(3000);

    // Get IP address
    let ipRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
    let gateway_ip = await retry(async () => {
      let res = await exec(`netsh interface ipv4 show config "Wi-Fi" | findstr /C:"Default Gateway"`)
      let ip = res.match(ipRegex);
      if (!ip) throw new Error(`Cannot get IP address of device ${info.product}`)
      return ip
    }, 5, 1000)
    debug(`Device IP: ${gateway_ip}`)

    // Fetch info
    let dev_info = await retry(() => request(`http://${gateway_ip}/board_info.json`, { json: true }), 5, 1000)

    debug(JSON.stringify(dev_info, null, '  '));

    try {
      await retry(() => request(`http://${gateway_ip}/config?ssid=${info.ssid}&pass=${info.pass}&blynk=${info.auth}&host=${info.server}&port=${info.port}`, { timeout: 1000 }), 5, 500)
    } catch (e) {}
  } finally {
    debug('Disconnecting...');
   
    await exec(`netsh wlan disconnect ${iface}`);
    await exec(`netsh wlan delete profile ${iface} name="${info.product}"`);

    if (selectedIf.Profile) {
      debug(`Reconnecting to '${selectedIf.Profile}'`);
      await exec(`netsh wlan connect ${iface} name="${selectedIf.Profile}" ssid="${selectedIf.SSID}"`);
    }
  }

  return true;
}

module.exports = { wifiSetup }
