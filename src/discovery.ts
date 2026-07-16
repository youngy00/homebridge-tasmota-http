import http from 'node:http';

export interface DiscoveredTasmotaDevice {
  ip: string;
  friendlyName: string;
  hostname: string;
  module: string;
  version: string;

  power: boolean;
  dimmer: boolean;
  rgb: boolean;
  colorTemperature: boolean;

  suggestedType:
    | 'light'
    | 'switch'
    | 'outlet'
    | 'fan'
    | 'unknown';
}

export class TasmotaDiscovery {

  constructor(
    private readonly timeout = 1000,
  ) {}

  public async discoverHost(
    ip: string,
  ): Promise<DiscoveredTasmotaDevice | null> {

    const status0 = await this.request(ip, 'Status 0');

    if (!status0?.Status) {
      return null;
    }

    const status11 = await this.request(ip, 'Status 11');

    const sts =
      status11?.StatusSTS ??
      status11?.Status11 ??
      {};

    const hasPower =
      sts.POWER !== undefined;

    const hasDimmer =
      sts.Dimmer !== undefined ||
      sts.DIMMER !== undefined;

    const hasColor =
      sts.Color !== undefined;

    const hasCT =
      sts.CT !== undefined;

    return {

      ip,

      friendlyName:
        status0.Status.FriendlyName?.[0] ??
        'Unknown',

      hostname:
        status0.Status.DeviceName ??
        status0.Status.Hostname ??
        '',

      module:
        status0.Status.Module ??
        'Unknown',

      version:
        status0.Status.Version ??
        'Unknown',

      power: hasPower,
      dimmer: hasDimmer,
      rgb: hasColor,
      colorTemperature: hasCT,

      suggestedType:
        this.determineType(
          hasPower,
          hasDimmer,
          hasColor,
          hasCT,
        ),
    };
  }

  private determineType(
    power: boolean,
    dimmer: boolean,
    rgb: boolean,
    ct: boolean,
  ): 'light' | 'switch' | 'outlet' | 'fan' | 'unknown' {

    if (dimmer || rgb || ct) {
      return 'light';
    }

    if (power) {
      return 'switch';
    }

    return 'unknown';
  }

  private request(
    ip: string,
    command: string,
  ): Promise<any> {

    const url =
      `http://${ip}/cm?cmnd=${encodeURIComponent(command)}`;

    return new Promise((resolve) => {

      const req = http.get(url, (res) => {

        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {

          try {
            resolve(JSON.parse(body));
          } catch {
            resolve(null);
          }

        });

      });

      req.setTimeout(this.timeout, () => {
        req.destroy();
        resolve(null);
      });

      req.on('error', () => {
        resolve(null);
      });

    });

  }

}