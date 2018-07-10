# Blynk Tools

Command-line automation tools for working with Blynk IoT Platform

## Installation
```bash
npm install -g blynk-tools
```

## Features

- **Device**
  - Show status
  - Read/write virtual pins
  - Provision device via WiFi AP
  - Initiate OTA
- **Gateway**
  - Connect your BLE devices to Blynk server
  - Connect your USB/Serial devices to Blynk server
- **Firmware**
  - Extract info tags from firmware binary
  - Replace/Patch info tags

### Enable command completion on linux

```bash
eval "$( blynk completion )"
```

