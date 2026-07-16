import { API, Characteristic, DynamicPlatformPlugin, Logging, PlatformAccessory, PlatformConfig, Service } from 'homebridge';
import { TasmotaLightAccessory } from './accessory';
import { TasmotaDeviceConfig } from './types';

export const PLUGIN_NAME = 'homebridge-tasmota-http';
export const PLATFORM_NAME = 'TasmotaHttp';

interface TasmotaPlatformConfig extends PlatformConfig {
  devices?: TasmotaDeviceConfig[];
}

export class TasmotaHttpPlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;
  public readonly log: Logging;

  private readonly config: TasmotaPlatformConfig;
  private readonly api: API;
  private readonly cachedAccessories = new Map<string, PlatformAccessory>();
  private readonly configuredAccessories = new Set<string>();

  constructor(log: Logging, config: PlatformConfig, api: API) {
    this.log = log;
    this.config = config as TasmotaPlatformConfig;
    this.api = api;
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.api.on('didFinishLaunching', () => {
      this.discoverDevices();
    });
  }

  public configureAccessory(accessory: PlatformAccessory): void {
    const device = accessory.context.device as TasmotaDeviceConfig | undefined;
    if (!device) {
      this.log.warn(`Accessory ${accessory.displayName} has no device context; skipping configuration.`);
      return;
    }

    this.cachedAccessories.set(accessory.UUID, accessory);
    if (this.configuredAccessories.has(accessory.UUID)) {
      return;
    }

    this.configuredAccessories.add(accessory.UUID);
    this.log.debug(`Configuring accessory from cache: ${accessory.displayName}`);
    new TasmotaLightAccessory(this, accessory, device);
  }

  private discoverDevices(): void {
    const devices = Array.isArray(this.config.devices) ? this.config.devices : [];
    const desiredAccessoryIds = new Set<string>();
    const accessoriesToRegister: PlatformAccessory[] = [];

    for (const device of devices) {
      const uuid = this.getAccessoryUuid(device);
      desiredAccessoryIds.add(uuid);

      let accessory = this.cachedAccessories.get(uuid);
      if (!accessory) {
        accessory = new this.api.platformAccessory(device.name, uuid);
        accessory.context.device = device;
        this.cachedAccessories.set(uuid, accessory);
        accessoriesToRegister.push(accessory);
      } else {
        accessory.context.device = device;
      }
    }

    if (accessoriesToRegister.length > 0) {
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, accessoriesToRegister);
    }

    for (const accessory of accessoriesToRegister) {
      this.configureAccessory(accessory);
    }

    const staleAccessories = Array.from(this.cachedAccessories.values()).filter((accessory) => !desiredAccessoryIds.has(accessory.UUID));
    if (staleAccessories.length > 0) {
      this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, staleAccessories);
      staleAccessories.forEach((accessory) => {
        this.cachedAccessories.delete(accessory.UUID);
        this.configuredAccessories.delete(accessory.UUID);
      });
    }
  }

  private getAccessoryUuid(device: TasmotaDeviceConfig): string {
    return this.api.hap.uuid.generate(`${PLUGIN_NAME}:${device.name}:${device.host}:${device.port ?? 80}`);
  }
}
