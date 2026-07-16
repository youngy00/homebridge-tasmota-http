# homebridge-tasmota-http

HTTP-only Homebridge dynamic platform for Tasmota lights.

## Features

- Uses the native Tasmota HTTP API at /cm?cmnd=
- Supports on/off and brightness only
- Uses Status 11 for polling
- No MQTT and no Home Assistant dependency
- Does not implement RGB or colour temperature

## Example configuration

```json
{
  "platforms": [
    {
      "platform": "TasmotaHttp",
      "devices": [
        {
          "name": "Living Room Lamp",
          "host": "192.168.1.50",
          "port": 80,
          "pollInterval": 15
        }
      ]
    }
  ]
}
```
