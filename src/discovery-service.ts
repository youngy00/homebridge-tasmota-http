import {
  DiscoveredTasmotaDevice,
  TasmotaDiscovery,
} from './discovery';

import {
  DeviceManager,
  ManagedDevice,
} from './device-manager';

import { ConfigManager } from './config-manager';

import {
  Logging,
} from 'homebridge';

import {
  TasmotaDeviceConfig,
} from './types';

export class DiscoveryService {

  private readonly discovery: TasmotaDiscovery;
  private readonly deviceManager = new DeviceManager();
  private readonly configManager = new ConfigManager();

constructor(
  private readonly log: Logging,
) {

    this.discovery = new TasmotaDiscovery(log);

  }

public setConfiguredDevices(
  devices: TasmotaDeviceConfig[],
): void {

  this.deviceManager.setConfiguredDevices(
    devices,
  );

  this.configManager.setDevices(
    devices,
  );

}

  public async scan(
    subnet: string,
  ): Promise<ManagedDevice[]> {

    this.log.info(
      `Scanning subnet ${subnet}.0/24...`,
    );

    const devices = await this.discovery.scanSubnet(
      subnet,
    );

    this.deviceManager.setDiscoveredDevices(
      devices,
    );

    return this.deviceManager.getManagedDevices();

  }

  public getDiscoveredDevices(): DiscoveredTasmotaDevice[] {

    return this.deviceManager.getDiscoveredDevices();

  }

  public getImportableDevices(): DiscoveredTasmotaDevice[] {

    return this.deviceManager.getImportableDevices();

  }

  public getManagedDevices(): ManagedDevice[] {

    return this.deviceManager.getManagedDevices();

  }

  public importDevice(
    host: string,
  ): TasmotaDeviceConfig | undefined {

    const device = this.deviceManager
      .getDiscoveredDevices()
      .find(
        discovered => discovered.ip === host,
      );

    if (!device) {
      return undefined;
    }

    return this.configManager.importDevice(
      device,
    );

  }

}