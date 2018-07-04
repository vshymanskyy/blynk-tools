/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const net = require('net')
const tls = require('tls')
const fs = require('fs')
const path = require('path')

var debug = require('debug')('SSL')
var chalk = require('chalk')

// TODO: allow searching relative to user path
const default_certs_path = path.join(__dirname, "..", "certs");

const EventEmitter = require('events');

class SslClient extends EventEmitter {

  constructor(options) {
    super();
    
    options = options || {};
    const certs_path = options.certs_path || default_certs_path;

    this.host = options.host || "blynk-cloud.com";
    this.port = options.port || 8441;
    // These are necessary only if using the client certificate authentication
    this.key  = options.key  || null;
    this.cert = options.cert || null;
    this.pass = options.pass || null;
    // This is necessary only if the server uses the self-signed certificate
    this.ca   = options.ca   || [ path.join(certs_path, this.host + '.crt') ];
    this.servername = options.servername || this.host;
  }

  write(data) {
    if (this.sock) {
      this.sock.write(data, 'binary');
    }
  }

  connect(done) {
    const self = this;
    if (self.sock) {
      self.disconnect();
    }

    let opts = {
      host: self.host,
      port: self.port,
      servername: self.servername,
      rejectUnauthorized: false,
      family: 4
    };
    if (self.key) { 
      if (Buffer.isBuffer(self.key)) {
        opts.key = self.key;
      } else {
        opts.key = fs.readFileSync(self.key); 
      }
    }
    if (self.cert) { 
      if (Buffer.isBuffer(self.cert)) {
        opts.cert = self.cert;
      } else {
        opts.cert = fs.readFileSync(self.cert); 
      }
    }
    if (self.pass) { opts.passphrase = self.pass; }
    if (self.ca)   {
      if (Buffer.isBuffer(self.ca)) {
        opts.ca = self.ca;
      } else {
        opts.ca = self.ca.map(function(item){
          return fs.readFileSync(item);
        });
      }
    }

    debug("Connecting to:", self.host + ":" + self.port);
    let sock = new net.Socket();
    sock.on('error', function(err) {
      self.emit('error', err);
    });
    sock.connect({
      host: self.host,
      family: 4,
      port: self.port
    }, function() {
      debug("SSL authorization...");
      opts.socket = sock;
      self.sock = tls.connect(opts, function() {
        if (!self.sock.authorized) {
          throw new Error('SSL not authorized');
        }
        debug('Connected');
        self.sock.setNoDelay(true);
        self.sock.setEncoding('binary');
        self.sock.on('data', function(data) {
          self.emit('data', data);
        });
        self.sock.on('end', function(data) {
          self.emit('end', data);
        });
        
        done();
      });

      self.sock.on('error', function(err) {
        debug('error', err.code);
        self.emit('error', err);
      });
    });
  }

  disconnect() {
    if (this.sock) {
      this.sock.destroy();
      this.sock.removeAllListeners();
      this.sock = null;
    }
  }
}

module.exports = SslClient;
