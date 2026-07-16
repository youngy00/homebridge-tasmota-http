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

export class DeviceManager {

  private discoveredDevices: DiscoveredTasmotaDevice[] = [];
  private configuredDevices: TasmotaDeviceConfig[] = [];

  //
  // Configured Devices
  //

  public setConfiguredDevices(
    devices: TasmotaDeviceConfig[],
  ): void {

    this.configuredDevices = [...devices];

  }

  public getConfiguredDevices():
    TasmotaDeviceConfig[] {

    return [...this.configuredDevices];

  }

  //
  // Discovered Devices
  //

  public setDiscoveredDevices(
    devices: DiscoveredTasmotaDevice[],
  ): void {

    this.discoveredDevices = [...devices];

  }

  public getDiscoveredDevices():
    DiscoveredTasmotaDevice[] {

    return [...this.discoveredDevices];

  }

public getImportableDevices():
  DiscoveredTasmotaDevice[] {

  return this.discoveredDevices.filter((discovered) => {

    return !this.configuredDevices.some((configured) => {

      return configured.host === discovered.ip;

    });

  });

}

public getManagedDevices():
  ManagedDevice[] {

  return this.discoveredDevices.map((device) => {

    const configuredDevice =
      this.configuredDevices.find(
        (configured) => configured.host === device.ip,
      );

    return {

      discovered: device,

      configured: configuredDevice !== undefined,

      configuredDevice,

    };

  });

}
  //
  // Maintenance
  //

  public clear(): void {

    this.discoveredDevices = [];
    this.configuredDevices = [];

  }

}