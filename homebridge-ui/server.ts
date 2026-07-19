import { HomebridgePluginUiServer } from '@homebridge/plugin-ui-utils';
import fs from 'node:fs/promises';

import { TasmotaDiscovery } from '../src/discovery';

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

/**
 * Server-side handlers for the custom config UI.
 *
 * IMPORTANT: this class must never write to `config.json` itself. The main
 * Homebridge UI owns that file, and only the browser-side `window.homebridge`
 * SDK (`getPluginConfig` / `updatePluginConfig` / `savePluginConfig`) knows
 * how to update it safely — that's the same mechanism the "Settings" form
 * uses when the user clicks Save. A plugin process reading the file,
 * editing it, and writing it back out on its own can race with that save
 * and clobber changes (this used to overwrite/lose config here). So this
 * server only ever *reads* config, for informational endpoints like /scan;
 * all writes happen client-side in ui/src/App.ts.
 */
class TasmotaUiServer extends HomebridgePluginUiServer {

  constructor() {

    super();

    this.onRequest('/ping', async () => ({
      status: 'ok',
    }));

    this.onRequest('/config', async () => {

      const config = await this.readPlatformConfig();

      return {
        scanSubnet: config?.scanSubnet ?? null,
      };
    });

    this.onRequest('/scan', async () => {

      const config = await this.readPlatformConfig();

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

      // The browser already renders each discovered device, so this scan
      // doesn't need to also echo every device into the Homebridge log.
      const discovery = new TasmotaDiscovery({ info: () => {} });

      const discovered = await discovery.scanSubnet(config.scanSubnet);

      const configuredHosts = new Set(
        (config.devices ?? []).map(device => device.host),
      );

      const devices: UiDevice[] = discovered.map(device => ({
        name: device.friendlyName,
        host: device.ip,
        configured: configuredHosts.has(device.ip),
      }));

      return devices;
    });

    this.ready();
  }

  /** Read-only lookup of this plugin's platform block. Never writes. */
  private async readPlatformConfig(): Promise<PluginConfig | undefined> {

    if (!this.homebridgeConfigPath) {
      throw new Error('homebridgeConfigPath is unavailable.');
    }

    const json = await fs.readFile(this.homebridgeConfigPath, 'utf8');
    const config = JSON.parse(json) as HomebridgeConfig;

    return config.platforms?.find(
      platform => platform.platform === 'TasmotaHttp',
    );
  }
}

new TasmotaUiServer();
