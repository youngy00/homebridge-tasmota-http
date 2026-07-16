import http from 'node:http';

export interface DiscoveredTasmotaDevice {
  ip: string;
  friendlyName: string;
  hostname: string;
  module: string;
  version: string;
}

export class TasmotaDiscovery {

  constructor(
    private readonly timeout = 1000,
  ) {}

  public async discoverHost(
    ip: string,
  ): Promise<DiscoveredTasmotaDevice | null> {

    const url =
      `http://${ip}/cm?cmnd=Status%200`;

    return new Promise((resolve) => {

      const req = http.get(url, (res) => {

        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {

          try {

            const json = JSON.parse(body);

            if (!json.Status) {
              resolve(null);
              return;
            }

            resolve({
              ip,
              friendlyName:
                json.Status.FriendlyName?.[0] ?? 'Unknown',

              hostname:
                json.Status.DeviceName ??
                json.Status.Hostname ??
                '',

              module:
                json.Status.Module ??
                'Unknown',

              version:
                json.Status.Version ??
                'Unknown',
            });

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