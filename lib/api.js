/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const debug = require('debug')('Blynk:api')

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const rp = require('request-promise-native')
const firmware = require('./firmware.js')

async function getSessionCookieJar(server, email, passw) {

  // Prepare password for login procedure
  let final_pass = crypto.createHash('sha256');
  final_pass.update(passw, 'utf8');
  final_pass.update(crypto.createHash('sha256').update(email.toLowerCase(), 'utf8').digest());
  let password = final_pass.digest('base64');

  // Request session id
  const login_url = `https://${server.host}/api/login`;
  let cookieJar = rp.jar();
  let rsp = await rp({
    jar: cookieJar,
    url: login_url,
    method: 'POST',
    form: { email, password },
    simple: false,                 // skip rejecting redirect
    resolveWithFullResponse: true, // get full response
  });

  // Check
  if (rsp.statusCode !== 200) {
    throw new Error(`Login status ${rsp.statusCode}`);
  }
  if (!cookieJar.getCookies(login_url).length) {
    throw new Error('No session cookies found');
  }

  return cookieJar;
}

async function uploadFile(server, jar, data) {

  let res = await rp({
    method: 'POST',
    jar,
    uri: `https://${server.host}/api/upload`,
    formData: {
      upfile: {
        value:  data,
        options: {
          filename: 'firmware', // TODO
          contentType: 'application/octet-stream'
        }
      }
    }
  });

  return res;
}

async function startOTA(server, device, jar, filename) {

  let data = fs.readFileSync(filename);

  let tag = firmware.findTag(data, 'blnkinf');
  if (tag) {
    debug(`Metainfo: ${ JSON.stringify(tag.info) }`);
  } else {
    throw new Error(`Tag 'blnkinf' not found in ${argv.firmware}`);
  }

  // 1. Upload file

  const serverPath = await uploadFile(server, jar, data);

  // 2. Get device info

  let project = await rp({
    uri: `${server.url}/${device.auth}/project`,
    json: true,
  });

  let dev = project.devices.find(d => d.token === device.auth);

  if (!dev) {
    throw new Error(`Device not found`);
  }

  // 3. Initiate OTA

  let postData = {
    "firmwareOriginalFileName": path.basename(filename),
    "title":          "Update from blynk-tools",
    "pathToFirmware": serverPath,
    "checkBoardType": false,
    "attemptsLimit":  5,

    "productId":  dev.productId,
    "deviceIds":  [ dev.id ],
    "firmwareInfo": {
      "version":   tag.info.ver,
      "boardType": tag.info.dev,
      "buildDate": tag.info.build,
      "md5Hash":   crypto.createHash('md5').update(data).digest("hex").toLowerCase(),
    }
  };

  let res = await rp({
    method: 'POST',
    jar,
    uri: `https://${server.host}/api/ota/start`,
    body: postData,
    json: true
  });

  return res;
}

module.exports = { getSessionCookieJar, uploadFile, startOTA };
