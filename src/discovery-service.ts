import { TasmotaDiscovery } from './discovery';

import {
  DeviceManager,
  ManagedDevice,
} from './device-manager';

import { Logging } from 'homebridge';

import { TasmotaDeviceConfig } from './types';

export class DiscoveryService {

  private readonly discovery: TasmotaDiscovery;
  private readonly deviceManager = new DeviceManager();

  constructor(
    private readonly log: Logging,
  ) {
    this.discovery = new TasmotaDiscovery(log);
  }

  public setConfiguredDevices(devices: TasmotaDeviceConfig[]): void {
    this.deviceManager.setConfiguredDevices(devices);
  }

  public async scan(subnet: string): Promise<ManagedDevice[]> {

    this.log.info(`Scanning subnet ${subnet}.0/24...`);

    const devices = await this.discovery.scanSubnet(subnet);

    this.deviceManager.setDiscoveredDevices(devices);

    return this.deviceManager.getManagedDevices();
  }
}
