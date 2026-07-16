import {
  API,
  Characteristic,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
} from 'homebridge';

import { TasmotaLightAccessory } from './accessory';
import { TasmotaDeviceConfig } from './types';

export const PLUGIN_NAME = 'homebridge-tasmota-local';
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

  constructor(
    log: Logging,
    config: PlatformConfig,
    api: API,
  ) {

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

    this.log.info('────────────────────────────────────');
    this.log.info('Homebridge Tasmota Local v0.2.1');
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

  private getAccessoryUuid(
    device: TasmotaDeviceConfig,
  ): string {

    return this.api.hap.uuid.generate(
      `${PLUGIN_NAME}:${device.name}:${device.host}:${device.port ?? 80}`,
    );
  }
}