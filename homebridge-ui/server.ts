import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import fs from 'node:fs/promises';
import http from 'node:http';

interface PluginDevice {
  name: string;
  host: string;
  port: number;
  pollInterval: number;
}

interface PluginConfig {
  platform: string;
  scanSubnet?: string;
  devices?: PluginDevice[];
}

interface HomebridgeConfig {
  platforms?: PluginConfig[];
}

interface UiDevice {
  name: string;
  host: string;
  configured: boolean;
}

interface DiscoveredDevice {
  ip: string;
  friendlyName: string;
}

class TasmotaDiscovery {

  constructor(
    private readonly timeout = 1000,
    private readonly concurrency = 25,
  ) {}

  public async scanSubnet(
    subnet: string,
  ): Promise<DiscoveredDevice[]> {

    const devices: DiscoveredDevice[] = [];

    let current = 1;

    const worker = async () => {

      while (current <= 254) {

        const ip = `${subnet}.${current++}`;

        const device = await this.discoverHost(ip);

        if (device) {
          devices.push(device);
        }

      }

    };

    await Promise.all(
      Array.from(
        { length: this.concurrency },
        () => worker(),
      ),
    );

    devices.sort((a, b) =>
      a.ip.localeCompare(
        b.ip,
        undefined,
        { numeric: true },
      ),
    );

    return devices;

  }

  private async discoverHost(
    ip: string,
  ): Promise<DiscoveredDevice | null> {

    const status = await this.request(
      ip,
      'Status 0',
    );

    if (!status?.Status) {
      return null;
    }

    return {

      ip,

      friendlyName:
        status.Status.FriendlyName?.[0] ??
        'Unknown',

    };

  }

  private request(
    ip: string,
    command: string,
  ): Promise<any> {

    const url =
      `http://${ip}/cm?cmnd=${encodeURIComponent(command)}`;

    return new Promise(resolve => {

      const req = http.get(url, res => {

        let body = '';

        res.on('data', chunk => {
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

      req.on('error', () => resolve(null));

    });

  }

}
class TasmotaUiServer extends HomebridgePluginUiServer {

  constructor() {

    super();

    this.onRequest('/ping', async () => ({
      status: 'ok',
    }));

    this.onRequest('/config', async () => {

      const config = await this.getPluginConfig();

      return {
        scanSubnet: config?.scanSubnet ?? null,
      };

    });

    this.onRequest('/scan', async () => {

      const config = await this.getPluginConfig();

      if (!config) {
        throw new Error(
          'TasmotaHttp platform configuration was not found.',
        );
      }

      if (!config.scanSubnet) {
        throw new Error(
          'scanSubnet has not been configured.',
        );
      }

      const discovery = new TasmotaDiscovery();

      const discovered =
        await discovery.scanSubnet(
          config.scanSubnet,
        );

const configuredHosts = new Set(
  (config.devices ?? []).map(device => device.host),
);

const devices: UiDevice[] =
  discovered.map(device => ({

    name: device.friendlyName,

    host: device.ip,

    configured: configuredHosts.has(device.ip),

  }));

return devices;

    });

this.onRequest('/import', async (payload) => {

  const body = payload as {
    host?: string;
    name?: string;
  };

  if (!body.host) {
    throw new Error('No host specified.');
  }

  if (!this.homebridgeConfigPath) {
    throw new Error('homebridgeConfigPath unavailable.');
  }

  console.log(
  '[Tasmota UI] homebridgeConfigPath =',
  this.homebridgeConfigPath,
  );
  
  console.log('[Tasmota UI] Import requested:', body);

  const json = await fs.readFile(
    this.homebridgeConfigPath,
    'utf8',
  );

  console.log(
  '[Tasmota UI] Current config length:',
  json.length,
  );

  const fullConfig =
    JSON.parse(json) as HomebridgeConfig;

  const platform =
    fullConfig.platforms?.find(
      p => p.platform === 'TasmotaHttp',
    );

  if (!platform) {
    throw new Error('Platform not found.');
  }

  platform.devices ??= [];

  const existing = platform.devices.find(
    device => device.host === body.host,
  );

  if (!existing) {

    platform.devices.push({

      name: body.name ?? body.host,

      host: body.host,

      port: 80,

      pollInterval: 2,

    });

    console.log(
      '[Tasmota UI] Writing config with',
      platform.devices.length,
      'devices',
    );

    await fs.writeFile(
      this.homebridgeConfigPath,
      JSON.stringify(fullConfig, null, 4),
      'utf8',
    );

const verify = await fs.readFile(
  this.homebridgeConfigPath,
  'utf8',
);

console.log(
  '[Tasmota UI] Verify config length:',
  verify.length,
);

console.log(verify);

    console.log('[Tasmota UI] Config written successfully.');

  } else {

    console.log(
      '[Tasmota UI] Device already exists:',
      body.host,
    );

  }

  return {
    success: true,
  };

});

    this.ready();
    
  }

  private async getPluginConfig(): Promise<PluginConfig | undefined> {

    if (!this.homebridgeConfigPath) {
      throw new Error(
        'homebridgeConfigPath is unavailable.',
      );
    }

    const json = await fs.readFile(
      this.homebridgeConfigPath,
      'utf8',
    );

    const config =
      JSON.parse(json) as HomebridgeConfig;

    return config.platforms?.find(
      platform =>
        platform.platform === 'TasmotaHttp',
    );

  }

}
   
new TasmotaUiServer();