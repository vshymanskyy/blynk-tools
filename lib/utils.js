'use strict';

function tryRequire(name) {
  try{
    return require(name);
  } catch(err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      return undefined;
    }
    throw err;
  }
}

module.exports = { tryRequire };
