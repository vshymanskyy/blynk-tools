/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const os = require('os')

switch (os.platform()) {
  case 'linux':  module.exports = require('./linux.js');  break;
  //case 'darwin': module.exports = require('./darwin.js'); break;
  //case 'win32':  module.exports = require('./win32.js');  break;
  default:       throw new Error('WiFi Setup not available for ' + os.platform())
}
