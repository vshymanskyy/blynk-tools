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

/*
 * Text processing utilities
 */

function objFromKeyVals(pairs) {
    var ret = {};
    pairs.forEach(function (p) { ret[p[0]] = p[1]; });
    return ret;
}

function extractKeyVals(str) {
  return str.split(/[\r\n]+/)
          .map(x => x.split(/\s+:\s/)           // Split keys & values
                      .map(x => x.trim())       // Trim spaces
          ).filter(x => x[1] !== undefined)     // Remove empty
}

function extractSectionNames(str) {
  const regex = /^([\w ]+)\s+----+/gm;
  let result = [];
  let m;

  while ((m = regex.exec(str)) !== null) {
    // This is necessary to avoid infinite loops with zero-width matches
    if (m.index === regex.lastIndex) {
      regex.lastIndex++;
    }
    result.push(m[1]);
  }
  return result;
}

function extractSection(str, name) {
  let nl = '\\s*[\\r\\n]+';
  let text = '((?:.|\\r|\\n)*?)';
  let re = new RegExp(`^${name}\\s+----+${nl}${text}${nl}(?:\\w+----+|\\s+$)`, 'mui');
  let m = str.match(re);
  if (!m || !m[1]) {
    throw new Error(`Section ${name} not found`);
  }
  return m[1];
}

/*
 * netsh functions
 */

async function getInterfaces() {
  let result = await exec(`netsh wlan show interfaces`);
  result = result.split(/\s+Name\s+:/)                          // Split by Name
                  .splice(1)                                    // Remove header
                  .map(x => ("Name : " + x))                    // Add name
                  .map(extractKeyVals)
                  .map(objFromKeyVals);

  return result;
}

async function scanNetworks() {
  let result = await exec(`netsh wlan show networks ${iface} mode=BSSID`);
  result = result.split(/\s+SSID\s+\d+\s+:/)                    // Split by SSID
                  .splice(1)                                    // Remove header
                  .map(x => ("SSID : " + x))                    // Add name
                  .map(extractKeyVals)
                  .map(objFromKeyVals);

  return result;
}

async function getProfiles() {
  let result = await exec(`netsh wlan show profiles ${iface}`, true);
  
  let section = extractSection(result, 'User profiles')
  let keyvals = extractKeyVals(section)
  return keyvals.map(x => x[1]);
}

async function getProfileInfo(profile) {
  let result = await exec(`netsh wlan show profile ${iface} name="${profile}" key=clear`);

  console.log(extractSectionNames(result));
  
  result = extractKeyVals(result)
  result = objFromKeyVals(result)
  
  return result;
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
  let interfaces = await getInterfaces();
  let connectedIf = interfaces.filter(x => x.State === 'connected' && x.Profile)

  const selectedIf = connectedIf[0] || interfaces[0]
  if (selectedIf) {
    debug(`Using WiFi adapter: ${selectedIf.Name}`);
    iface = `i="${selectedIf.Name}"`
    if (selectedIf.Profile) {
      debug(`Currently connected to: ${selectedIf.Profile}`);
    }
    //let profiles = await getProfiles();
    //debug(profiles);
    
    //let prof = await getProfileInfo(selectedIf.Profile);
    //debug(`Password: ${prof['Key Content']}`);
  }

  const networks = await scanNetworks();
  const deviceNetworks = networks.filter(x => x.SSID === info.product);
  if (!deviceNetworks.length) {
    throw new Error(`Network '${info.product}' not found`);
  }

  try {
    debug(`Connecting to ${info.product}...`)
    try {
      await retry(() => connectWiFi(info.product), 5, 1000)
    } catch(e) {
      throw new Error(`Cannot connect to '${info.product}'`)
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
