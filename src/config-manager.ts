import {
  DiscoveredTasmotaDevice,
} from './discovery';

import {
  TasmotaDeviceConfig,
} from './types';

export class ConfigManager {

  private devices: TasmotaDeviceConfig[] = [];

  public setDevices(
    devices: TasmotaDeviceConfig[],
  ): void {

    this.devices = [...devices];

  }

  public getDevices():
    TasmotaDeviceConfig[] {

    return [...this.devices];

  }

   public createDeviceConfig( 
     device: DiscoveredTasmotaDevice,
   ): TasmotaDeviceConfig {

    return {
      name: device.friendlyName,
      host: device.ip,
      port: 80,
      pollInterval: 2,
    };

  }

public importDevice(
  device: DiscoveredTasmotaDevice,
): TasmotaDeviceConfig {

  const existing = this.devices.find(
    (configured) => configured.host === device.ip,
  );

  if (existing) {
    return existing;
  }

  const config =
    this.createDeviceConfig(device);

  this.devices.push(config);

  return config;

}

  public addDevice(
    device: TasmotaDeviceConfig,
  ): void {

    this.devices.push(device);

  }

  public removeDevice(
    host: string,
  ): void {

    this.devices =
      this.devices.filter(
        (device) => device.host !== host,
      );

  }

}