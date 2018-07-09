/**
 * Copyright 2017 Volodymyr Shymanskyy
 **/

'use strict';

const util = require('util')
const stream = require('stream')
const crc = require('crc')

const debug = require('debug')('BLE:lbb')
const dump  = require('debug')('BLE:dump')

const utils = require('../utils.js')

var commands = {
    MSG_ID_SERIAL_DATA        : Buffer.from([0x00, 0x00]),
    MSG_ID_BT_SET_ADV         : Buffer.from([0x05, 0x00]),
    MSG_ID_BT_SET_CONN        : Buffer.from([0x05, 0x02]),
    MSG_ID_BT_SET_LOCAL_NAME  : Buffer.from([0x05, 0x04]),
    MSG_ID_BT_SET_PIN         : Buffer.from([0x05, 0x06]),
    MSG_ID_BT_SET_TX_PWR      : Buffer.from([0x05, 0x08]),
    MSG_ID_BT_GET_CONFIG      : Buffer.from([0x05, 0x10]),
    MSG_ID_BT_ADV_ONOFF       : Buffer.from([0x05, 0x12]),
    MSG_ID_BT_SET_SCRATCH     : Buffer.from([0x05, 0x14]),
    MSG_ID_BT_GET_SCRATCH     : Buffer.from([0x05, 0x15]),
    MSG_ID_BT_RESTART         : Buffer.from([0x05, 0x20]),
    MSG_ID_GATING             : Buffer.from([0x05, 0x50]),
    MSG_ID_BL_CMD             : Buffer.from([0x10, 0x00]),
    MSG_ID_BL_FW_BLOCK        : Buffer.from([0x10, 0x01]),
    MSG_ID_BL_STATUS          : Buffer.from([0x10, 0x02]),
    MSG_ID_CC_LED_WRITE       : Buffer.from([0x20, 0x00]),
    MSG_ID_CC_LED_WRITE_ALL   : Buffer.from([0x20, 0x01]),
    MSG_ID_CC_LED_READ_ALL    : Buffer.from([0x20, 0x02]),
    MSG_ID_CC_ACCEL_READ      : Buffer.from([0x20, 0x10]),
    MSG_ID_CC_TEMP_READ       : Buffer.from([0x20, 0x11]),
    MSG_ID_AR_SET_POWER       : Buffer.from([0x30, 0x00]),
    MSG_ID_AR_GET_CONFIG      : Buffer.from([0x30, 0x06]),
    MSG_ID_DB_LOOPBACK        : Buffer.from([0xFE, 0x00]),
    MSG_ID_DB_COUNTER         : Buffer.from([0xFE, 0x01]),

};

function BleBeanSerial(peripheral, opts, options) {
  stream.Duplex.call(this, options);

  this.peripheral = peripheral;
  this.uuid_svc = opts.uuid_svc;
  this.uuid_rxtx = opts.uuid_rxtx;
  this.delay_send = opts.delay_send || 30;
  this.max_chunk = opts.max_chunk || 20;
  this.buff_tx = [];
  this.timer_tx = -1;

  this.count = 0;
  this.gst = new Buffer(0);
}

util.inherits(BleBeanSerial, stream.Duplex);

BleBeanSerial.prototype._onRead = function(gt){

  //see https://github.com/PunchThrough/bean-documentation/blob/master/serial_message_protocol.md

  //Received a single GT packet
  var start = (gt[0] & 0x80); //Set to 1 for the first packet of each App Message, 0 for every other packet
  var messageCount = (gt[0] & 0x60); //Increments and rolls over on each new GT Message (0, 1, 2, 3, 0, ...)
  var packetCount = (gt[0] & 0x1F); //Represents the number of packets remaining in the GST message

  //first packet, reset data buffer
  if (start) {
    this.gst = new Buffer(0);
  }

  //TODO probably only if messageCount is in order
  this.gst = Buffer.concat( [this.gst, gt.slice(1)] );

  //last packet, process and emit
  if(packetCount === 0){

    var length = this.gst[0]; //size of thse cmd and payload

    //crc only the size, cmd and payload
    var crcString = crc.crc16ccitt(this.gst.slice(0,this.gst.length-2));
    //messy buffer equality because we have to swap bytes and can't use string equality because tostring drops leading zeros
    
    //debug('CRC: ' , typeof crcString);
    var crc16 = new Buffer(2);
    crc16.writeUInt16BE(crcString, 0);
    
    var valid = (crc16[0]===this.gst[this.gst.length-1] && crc16[1]===this.gst[this.gst.length-2]);

    var command = ( (this.gst[2] << 8) + this.gst[3] ) & ~(0x80) ;

    //this.emit('raw', this.gst.slice(2,this.gst.length-2), length, valid, command);

    if(valid){

      //ideally some better way to do lookup
      if(command === (commands.MSG_ID_CC_ACCEL_READ[0] << 8 ) + commands.MSG_ID_CC_ACCEL_READ[1])
      {
        var x = (((this.gst[5] << 24) >> 16) | this.gst[4]) * 0.00391;
        var y = (((this.gst[7] << 24) >> 16) | this.gst[6]) * 0.00391;
        var z = (((this.gst[9] << 24) >> 16) | this.gst[8]) * 0.00391;

        this.emit('accell', x.toFixed(5), y.toFixed(5), z.toFixed(5), valid);

      } else if(this.gst[2] === commands.MSG_ID_SERIAL_DATA[0] && this.gst[3] === commands.MSG_ID_SERIAL_DATA[1]){
        
        var data = this.gst.slice(4,this.gst.length-2);
        
        if (!this.push(data)) {
          //this._source.readStop();
        }

      } else if(command === (commands.MSG_ID_CC_TEMP_READ[0] << 8 ) + commands.MSG_ID_CC_TEMP_READ[1]){

        this.emit('temp', this.gst[4], valid);

      }

    else{

      this.emit('invalid', this.gst.slice(2,this.gst.length-2), length, valid, command);

      }

    }

  }

};

BleBeanSerial.prototype.sendCmd = function(cmdBuffer,payloadBuffer,done) {
  var self = this;
  var sizeBuffer = new Buffer(2);
  sizeBuffer.writeUInt8(cmdBuffer.length + payloadBuffer.length,0);
  sizeBuffer.writeUInt8(0,1);

  //GST contains sizeBuffer, cmdBuffer, and payloadBuffer
  var gst = Buffer.concat([sizeBuffer,cmdBuffer,payloadBuffer]);

  var crcString = crc.crc16ccitt(gst);
  var crc16Buffer = new Buffer(2);
  crc16Buffer.writeUInt16LE(crcString, 0);
  
  gst = Buffer.concat([sizeBuffer,cmdBuffer,payloadBuffer,crc16Buffer]);
  
  var gt_qty = Math.floor(gst.length/19);
  if (gst.length % 19 != 0) {
    gt_qty += 1;
  }
  var optimal_packet_size = 19;
  
  for (var ch=0; ch<gt_qty; ch++) {
    var data = gst.slice(ch*optimal_packet_size, (ch+1)*optimal_packet_size);
    
    var gt = (self.count * 0x20); // << 5
    if (ch == 0) {
      gt |= 0x80;
    }
    gt |= gt_qty - ch - 1;
    
    gt = Buffer.concat([new Buffer([ gt ]), data]);
    self.buff_tx.push(gt);
  }

  if (self.timer_tx == -1) {
    //debug('send start');
    self.timer_tx = setInterval(function() {
      var chunk = self.buff_tx[0];
      self.buff_tx = self.buff_tx.slice(1);
      dump('<', utils.hexdump(chunk));
      self.char_rxtx.write(chunk, true);
      if (!self.buff_tx.length) {
        clearInterval(self.timer_tx);
        self.timer_tx = -1;
        //debug('send stop');
        if (typeof(done) == 'function') done();
      }
    }, self.delay_send);
  }

  self.count = (self.count + 1) % 4;
};

BleBeanSerial.prototype.connect = function (callback) {
  var self = this;
  self.peripheral.discoverServices([self.uuid_svc], function(err, services) {
    if (err) throw err;
    services.forEach(function(service) {
      service.discoverCharacteristics([self.uuid_rxtx], function(err, characteristics) {
        if (err) throw err;
        //debug("CHARS:", characteristics);
        self.char_rxtx = characteristics[0];
        self.char_rxtx.notify(true, function(err) {
          if (err) throw err;
        });
        self.char_rxtx.on('read', function(data, isNotification) {
          dump('>', utils.hexdump(data));
          self._onRead(data);
        });
        self.unGate();
        callback();
      });
    });
  });
};

BleBeanSerial.prototype._read = function (size) {
  //this._source.readStart();
};

BleBeanSerial.prototype._write = function (data, enc, done) {
  var i = 0;
  for (; i+64<data.length; i+=64) {
    this.sendCmd(commands.MSG_ID_SERIAL_DATA, data.slice(i, i+64));
  }
  this.sendCmd(commands.MSG_ID_SERIAL_DATA, data.slice(i, i+64), done);
};

BleBeanSerial.prototype.unGate = function(done) {
  this.sendCmd(commands.MSG_ID_GATING, Buffer.from([]), done);
}

BleBeanSerial.prototype.setColor = function(color,done) {
  this.sendCmd(commands.MSG_ID_CC_LED_WRITE_ALL, color, done);
};

BleBeanSerial.prototype.requestAccell = function(done) {
  this.sendCmd(commands.MSG_ID_CC_ACCEL_READ, Buffer.from([]), done);
};

BleBeanSerial.prototype.requestTemp = function(done) {
  this.sendCmd(commands.MSG_ID_CC_TEMP_READ, Buffer.from([]), done);
};

module.exports = BleBeanSerial;
