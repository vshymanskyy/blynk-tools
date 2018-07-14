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
  - Provision device via WiFi AP *(soon)*
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
> blynk device add 1a5c3988d60f477db6bac3417d53f132
```
You can add several devices. For more info on `device add` command, run `device add --help`.  
Now let's check the device status:
```sh
> blynk device list
```
We can now manipulate virtual pins of your devices (you need to ):
```sh
> blynk virtualWrite --device=... V0 123
> blynk virtualRead --device=... V0
```
Many commands in this suite need a `--device` to be specified.  
It may become cumbersome to specify it each and every time, so let's select the default one:
```sh
> blynk config default.device CoolDevice1
```
Now `blynk virtualWrite V0 123` works, and you can also see the default device in the device list:
```sh
> blynk device list
```

For more commands and examples, run `blynk [command] --help`.  

You can also enable command completion on BASH/ZSH/etc:
```bash
eval "$( blynk completion )"
```
