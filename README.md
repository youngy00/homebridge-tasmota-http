# homebridge-tasmota-http

HTTP-only Homebridge dynamic platform for Tasmota lights.

## Features

- Uses the native Tasmota HTTP API at /cm?cmnd=
- Supports on/off and brightness only
- Uses Status 11 for polling
- No MQTT and no Home Assistant dependency
- Does not implement RGB or colour temperature

## Development

```bash
npm install
npm run build   # builds ui/, the plugin, and the config-UI server into dist/
```

`ui/` is a separate Vite project for the custom config-UI frontend; `npm run build`
builds it automatically as part of the root build, so editing `ui/src/*` and
running `npm run build` from the repo root is enough — no manual copy step.

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
