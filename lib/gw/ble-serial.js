/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

var util = require('util')
var stream = require('stream')

var debug = require('debug')('BLE:stream')

function BleRawSerial(peripheral, opts, options) {
  stream.Duplex.call(this, options);

  this.peripheral = peripheral;
  this.uuid_svc = opts.uuid_svc;
  this.uuid_tx = opts.uuid_tx;
  this.uuid_rx = opts.uuid_rx;
  this.uuid_rxtx = opts.uuid_rxtx;
  this.uuid_cmd = opts.uuid_cmd;
  this.delay_send = opts.delay_send || 30;
  this.max_chunk = opts.max_chunk || 20;
  this.buff_tx = [];
  this.timer_tx = -1;
}

util.inherits(BleRawSerial, stream.Duplex);

BleRawSerial.prototype.connect = function (callback) {
  var self = this;
  self.peripheral.discoverServices([self.uuid_svc], function(err, services) {
    if (err) throw err;
    //debug("SERV:", services);

    services.forEach(function(service) {
      var chars = [self.uuid_rx, self.uuid_tx, self.uuid_rxtx, self.uuid_cmd].filter((n) => n != undefined);
      service.discoverCharacteristics(chars, function(err, characteristics) {
        if (err) throw err;
        //debug("CHAR:", characteristics);

        characteristics.forEach(function(char) {
          if (self.uuid_rxtx == char.uuid) {
            self.char_rx = char;
            self.char_tx = char;
          } else if (self.uuid_rx == char.uuid) {
            self.char_rx = char;
          } else if (self.uuid_tx == char.uuid) {
            self.char_tx = char;
          } else if (self.uuid_cmd == char.uuid) {
            self.char_cmd = char;
          }
        });

        if (self.char_tx.properties.indexOf("notify") < 0 ||
           (self.char_rx.properties.indexOf("write") < 0 && self.char_rx.properties.indexOf("writeWithoutResponse") < 0)
        ) {
          debug('TX:', self.char_tx.properties);
          debug('RX:', self.char_rx.properties);

          [self.char_tx, self.char_rx] = [self.char_rx, self.char_tx];
        }

        if (self.char_cmd) {
          debug('Configuring DFRobot...');
          /*self.char_cmd.on('read', function(data, isNotification) {
            dump('CMD>', data);
          });
          self.char_cmd.notify(true, function(err) {
            if (err) throw err;
          });*/

          self.char_cmd.write(new Buffer("AT\r\n"), true);
          self.char_cmd.write(new Buffer("AT+PASSWORD="), true);
          self.char_cmd.write(new Buffer("DFRobot\r\n"), true);
          self.char_cmd.write(new Buffer("AT+CURRUART="), true);
          self.char_cmd.write(new Buffer("115200\r\n"), true);
        }

        self.char_tx.on('read', function(data, isNotification) {
          //dump('>', data);
          if (!self.push(data)) {
            //self._source.readStop();
          }
        });
        self.char_tx.notify(true, function(err) {
          if (err) throw err;
          // callback()
        });
        callback(); // TODO
      });
    });
  });
};

BleRawSerial.prototype._read = function (size) {
  //this._source.readStart();
};

BleRawSerial.prototype._write = function (data, enc, done) {
  var self = this;

  // Cut data slices
  for (var i = 0; i<data.length; i+=self.max_chunk) {
    self.buff_tx.push(data.slice(i, i+self.max_chunk));
  }

  if (self.timer_tx == -1) {
    //debug('send start');
    self.timer_tx = setInterval(function() {
      var chunk = self.buff_tx[0];
      self.buff_tx = self.buff_tx.slice(1);
      //dump('<', chunk);
      self.char_rx.write(chunk, true);
      if (!self.buff_tx.length) {
        clearInterval(self.timer_tx);
        self.timer_tx = -1;
        //debug('send stop');
        if (typeof(done) == 'function') done();
      }
    }, self.delay_send);
  }
};

module.exports = BleRawSerial;
