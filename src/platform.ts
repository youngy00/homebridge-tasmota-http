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

    this.log.debug(`Configuring accessory from cache: ${accessory.displayName}`);
    new TasmotaLightAccessory(this, accessory, device);
  }

  private discoverDevices(): void {
    const devices = Array.isArray(this.config.devices) ? this.config.devices : [];
    for (const device of devices) {
      const uuid = this.api.hap.uuid.generate(`${PLUGIN_NAME}:${device.name}:${device.host}:${device.port ?? 80}`);
      const accessory = new this.api.platformAccessory(device.name, uuid);
      accessory.context.device = device;
      accessory.addService(this.Service.AccessoryInformation);
      accessory.addService(this.Service.Lightbulb, device.name, device.name);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.configureAccessory(accessory);
    }
  }
}
