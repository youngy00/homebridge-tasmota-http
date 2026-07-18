import {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  Service,
} from 'homebridge';

import { TasmotaLightAccessory } from './accessory';
import {
  TasmotaDiscovery,
  DiscoveredTasmotaDevice,
} from './discovery';
import {
  TasmotaDeviceConfig,
  TasmotaPlatformConfig,
} from './types';

import {
  DeviceManager,
  ManagedDevice,
} from './device-manager';

import { ConfigManager } from './config-manager';
import { DiscoveryService } from './discovery-service';
import { UiService } from './ui-service';

export const PLUGIN_NAME = 'homebridge-tasmota-local';
export const PLATFORM_NAME = 'TasmotaHttp';


export class TasmotaHttpPlatform implements DynamicPlatformPlugin, UiService {


  
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly log: Logging;

  private readonly config: TasmotaPlatformConfig;
  private readonly api: API;
  private readonly discoveryService: DiscoveryService;

  private readonly cachedAccessories = new Map<string, PlatformAccessory>();
  private readonly configuredAccessories = new Set<string>();

constructor(
  log: Logging,
  config: TasmotaPlatformConfig,
  api: API,
) {

  this.log = log;
  this.config = config;
    this.api = api;

    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

this.discoveryService = new DiscoveryService(
  this.log,
);

    this.api.on('didFinishLaunching', async () => {
      this.discoverDevices();
     await this.runDiscovery();
    });
  }

  public configureAccessory(accessory: PlatformAccessory): void {

    const device =
      accessory.context.device as TasmotaDeviceConfig | undefined;

    if (!device) {
      this.log.warn(
        `Ignoring cached accessory '${accessory.displayName}' because device context is missing.`,
      );
      return;
    }

    this.cachedAccessories.set(accessory.UUID, accessory);

    if (this.configuredAccessories.has(accessory.UUID)) {
      return;
    }

    this.configuredAccessories.add(accessory.UUID);

    new TasmotaLightAccessory(
      this,
      accessory,
      device,
    );
  }

  private discoverDevices(): void {

    const devices = Array.isArray(this.config.devices)
      ? this.config.devices
      : [];
this.discoveryService.setConfiguredDevices(
  devices,
);
    
    this.log.info('────────────────────────────────────');
    this.log.info('Homebridge Tasmota Local v0.4.0-dev');
    this.log.info(`Configured devices : ${devices.length}`);
    this.log.info('────────────────────────────────────');

    const desiredAccessoryIds = new Set<string>();
    const accessoriesToRegister: PlatformAccessory[] = [];

    for (const device of devices) {

      //
      // Validation
      //

      if (!device.name?.trim()) {
        this.log.warn(
          'Skipping device because no name has been configured.',
        );
        continue;
      }

      if (!device.host?.trim()) {
        this.log.warn(
          `Skipping '${device.name}' because no host has been configured.`,
        );
        continue;
      }

      const uuid = this.getAccessoryUuid(device);

      desiredAccessoryIds.add(uuid);

      let accessory = this.cachedAccessories.get(uuid);

      if (!accessory) {

        this.log.info(
          `Adding accessory '${device.name}' (${device.host})`,
        );

        accessory = new this.api.platformAccessory(
          device.name,
          uuid,
        );

        accessory.context.device = device;

        this.cachedAccessories.set(
          uuid,
          accessory,
        );

        accessoriesToRegister.push(accessory);

      } else {

        accessory.context.device = device;

        this.log.debug(
          `Using cached accessory '${device.name}'`,
        );
      }
    }

    if (accessoriesToRegister.length > 0) {

      this.api.registerPlatformAccessories(
        PLUGIN_NAME,
        PLATFORM_NAME,
        accessoriesToRegister,
      );
    }

    for (const accessory of accessoriesToRegister) {
      this.configureAccessory(accessory);
    }

    const staleAccessories =
      Array.from(this.cachedAccessories.values()).filter(
        (accessory) => !desiredAccessoryIds.has(accessory.UUID),
      );

    if (staleAccessories.length > 0) {

      this.log.info(
        `Removing ${staleAccessories.length} stale accessories.`,
      );

      this.api.unregisterPlatformAccessories(
        PLUGIN_NAME,
        PLATFORM_NAME,
        staleAccessories,
      );

      for (const accessory of staleAccessories) {
        this.cachedAccessories.delete(accessory.UUID);
        this.configuredAccessories.delete(accessory.UUID);
      }
    }

    this.log.info('Platform initialisation complete.');
  }

public async runDiscovery(): Promise<ManagedDevice[]> {

  if (!this.config.scanSubnet) {
    return [];
  }

  const managed = await this.discoveryService.scan(
    this.config.scanSubnet,
  );

  this.log.info(
    `Discovery complete. Found ${managed.length} device(s).`,
  );

  this.log.info('');
  this.log.info('Discovered devices');
  this.log.info('────────────────────────────────────');

  for (const device of managed) {

    const status = device.configured
      ? '✓ Configured'
      : '+ Import';

    this.log.info(
      `${status.padEnd(14)} ${device.discovered.friendlyName} (${device.discovered.ip})`,
    );

  }

  return managed;

}

public async scan(): Promise<ManagedDevice[]> {

  return this.runDiscovery();

}
public getDiscoveredDevices(): DiscoveredTasmotaDevice[] {

  return this.discoveryService.getDiscoveredDevices();

}

public getImportableDevices(): DiscoveredTasmotaDevice[] {

  return this.discoveryService.getImportableDevices();

}

public getManagedDevices(): ManagedDevice[] {

  return this.discoveryService.getManagedDevices();

}


public async importDevice(
  host: string,
): Promise<TasmotaDeviceConfig | undefined> {

  return this.discoveryService.importDevice(host);

}

public async import(
  host: string,
): Promise<void> {

  const device = await this.importDevice(host);

  if (!device) {
    throw new Error(`Device '${host}' was not found.`);
  }

}

  private getAccessoryUuid(
    device: TasmotaDeviceConfig,
  ): string {

    return this.api.hap.uuid.generate(
      `${PLUGIN_NAME}:${device.name}:${device.host}:${device.port ?? 80}`,
    );
  }
}