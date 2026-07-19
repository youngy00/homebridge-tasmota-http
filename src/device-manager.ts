import {
  DiscoveredTasmotaDevice,
} from './discovery';

import {
  TasmotaDeviceConfig,
} from './types';

export interface ManagedDevice {
  discovered: DiscoveredTasmotaDevice;
  configured: boolean;
  configuredDevice?: TasmotaDeviceConfig;
}

/**
 * Cross-references the results of a subnet scan against the devices the
 * user has configured, purely for the informational startup log (see
 * TasmotaHttpPlatform.runDiscovery). It does not read or write config.json.
 */
export class DeviceManager {

  private discoveredDevices: DiscoveredTasmotaDevice[] = [];
  private configuredDevices: TasmotaDeviceConfig[] = [];

  public setConfiguredDevices(devices: TasmotaDeviceConfig[]): void {
    this.configuredDevices = [...devices];
  }

  public setDiscoveredDevices(devices: DiscoveredTasmotaDevice[]): void {
    this.discoveredDevices = [...devices];
  }

  public getManagedDevices(): ManagedDevice[] {

    return this.discoveredDevices.map((device) => {

      const configuredDevice = this.configuredDevices.find(
        (configured) => configured.host === device.ip,
      );

      return {
        discovered: device,
        configured: configuredDevice !== undefined,
        configuredDevice,
      };
    });
  }
}
