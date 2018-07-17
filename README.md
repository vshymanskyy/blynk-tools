[![NPM version](https://img.shields.io/npm/v/blynk-tools.svg)](https://www.npmjs.com/package/blynk-tools)
[![NPM download](https://img.shields.io/npm/dm/blynk-tools.svg)](https://www.npmjs.com/package/blynk-tools)
[![GitHub stars](https://img.shields.io/github/stars/vshymanskyy/blynk-tools.svg)](https://github.com/vshymanskyy/blynk-tools)
[![GitHub issues](https://img.shields.io/github/issues/vshymanskyy/blynk-tools.svg)](https://github.com/vshymanskyy/blynk-tools/issues)
[![GitHub license](https://img.shields.io/badge/license-GPLv3-blue.svg)](https://github.com/vshymanskyy/blynk-tools)

[![NPM](https://nodei.co/npm/blynk-tools.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/blynk-tools/)

__________

# Blynk Tools

Command-line automation tools for working with Blynk IoT Platform

## Installation

```bash
npm install -g blynk-tools
```

## Features

- **Device**
  - Maintain device list
  - Show device status
  - Read/write virtual pins
  - Provision device WiFi credentials
  - Initiate OTA *(soon)*
- **Gateway**
  - Connect your BLE devices to the Blynk server
  - Connect your USB/Serial devices to the Blynk server *(soon)*
- **Firmware**
  - Extract info tags from the firmware
  - Replace/patch info tags
  
## Getting Started

Register an account using Blynk App, and create a new project.  
Use the provided auth token to register your device for use in `blynk tools`:
```sh
> blynk device add 1a5c3988d60f477db6bac3417df7396d --name=CoolDevice1
⠋  Adding device...
●  CoolDevice1
```
If the device is recognized, it displays it's name and online/offline status. You can add multiple devices.  
For more info on `device add` command, run `device add --help`.  
Now let's check the device status:
```sh
> blynk device list
⠋  Refreshing device status...
┌────────┬────────────────┬────────┬───────────┐
│ Status │ Name           │ Server │ Token     │
├────────┼────────────────┼────────┼───────────┤
│ ●      │ PC Remote      │ Blynk  │ ...36a645 │
│ ○      │ Bluetooth test │ Test   │ ...427f4c │
│ ●      │ CoolDevice1    │ Blynk  │ ...f7396d │
└────────┴────────────────┴────────┴───────────┘
```
We can manipulate virtual pins of your devices (you need to specify either device name or auth token):
```sh
> blynk virtualWrite --device=CoolDevice1 V0 123
V0 set to [123]
> blynk virtualRead --device=CoolDevice1 V0
[123]
```
Many commands in this suite require a `--device` to be specified.  
It may become cumbersome, so let's select the default device:
```sh
> blynk config default.device "CoolDevice1"
New default.device value: "CoolDevice1"
```
Now `blynk virtualWrite V0 123` works, and you can also see the default device in the device list:
```sh
> blynk device list
┌────────┬────────────────┬────────┬───────────┐
│ Status │ Name           │ Server │ Token     │
├────────┼────────────────┼────────┼───────────┤
│ ●      │ PC Remote      │ Blynk  │ ...36a645 │
│ ○      │ Bluetooth test │ Test   │ ...427f4c │
│ ●  ⇨   │ CoolDevice1    │ Blynk  │ ...f7396d │
└────────┴────────────────┴────────┴───────────┘
```

For more commands and examples, run `blynk [command] --help`.  

You can also enable command completion on BASH/ZSH/etc:
```bash
eval "$( blynk completion )"
```
