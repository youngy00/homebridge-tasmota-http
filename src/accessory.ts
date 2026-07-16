import { PlatformAccessory, Service } from 'homebridge';
import { TasmotaHttpPlatform } from './platform';
import { TasmotaClient } from './tasmota-client';
import { TasmotaDeviceConfig, TasmotaStatus11 } from './types';

export class TasmotaLightAccessory {
  private readonly service: Service;
  private readonly client: TasmotaClient;
  private readonly pollIntervalMs: number;
  private pollingTimer?: NodeJS.Timeout;
  private isOn = false;
  private brightness = 100;

  constructor(
    private readonly platform: TasmotaHttpPlatform,
    private readonly accessory: PlatformAccessory,
    private readonly device: TasmotaDeviceConfig,
  ) {
    this.client = new TasmotaClient(device, platform.log);

    // Default poll interval = 2 seconds
    this.pollIntervalMs = Math.max(1, device.pollInterval ?? 2) * 1000;

    this.service = this.createService();
    this.setupCharacteristics();

    this.accessory.on('identify', () => this.identify());

    this.refreshState().catch((error) => {
      this.platform.log.error(
        `Unable to initialize Tasmota state for ${device.name}: ${error}`,
      );
    });

    this.startPolling();
  }

  public identify(): void {
    this.platform.log.info(`Identify requested for ${this.device.name}`);
  }

  private createService(): Service {
    const informationService =
      this.accessory.getService(this.platform.Service.AccessoryInformation) ??
      this.accessory.addService(this.platform.Service.AccessoryInformation);

    informationService
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Tasmota')
      .setCharacteristic(this.platform.Characteristic.Model, 'HTTP Light')
      .setCharacteristic(
        this.platform.Characteristic.SerialNumber,
        `${this.device.host}:${this.device.port ?? 80}`,
      );

    let service = this.accessory.getService(this.platform.Service.Lightbulb);

    if (!service) {
      service = this.accessory.addService(
        this.platform.Service.Lightbulb,
        this.device.name,
        this.device.name,
      );
    }

    service.setCharacteristic(
      this.platform.Characteristic.Name,
      this.device.name,
    );

    return service;
  }

  private setupCharacteristics(): void {
    const onCharacteristic = this.service.getCharacteristic(
      this.platform.Characteristic.On,
    );

    onCharacteristic.onSet(async (value) => {
      await this.handlePowerChange(Boolean(value));
    });

    onCharacteristic.onGet(() => this.isOn);

    const brightnessCharacteristic = this.service.getCharacteristic(
      this.platform.Characteristic.Brightness,
    );

    brightnessCharacteristic.setProps({
      minValue: 1,
      maxValue: 100,
      minStep: 1,
    });

    brightnessCharacteristic.onSet(async (value) => {
      await this.handleBrightnessChange(Number(value));
    });

    brightnessCharacteristic.onGet(() => this.brightness);
  }

  private async handlePowerChange(on: boolean): Promise<void> {
    await this.client.setPower(on);

    this.isOn = on;

    this.service.updateCharacteristic(
      this.platform.Characteristic.On,
      this.isOn,
    );
  }

  private async handleBrightnessChange(brightness: number): Promise<void> {
    const clamped = Math.max(1, Math.min(100, Math.round(brightness)));

    await this.client.setBrightness(clamped);

    this.brightness = clamped;
    this.isOn = true;

    this.service.updateCharacteristic(
      this.platform.Characteristic.Brightness,
      this.brightness,
    );

    this.service.updateCharacteristic(
      this.platform.Characteristic.On,
      true,
    );
  }

  private startPolling(): void {
    this.pollingTimer = setInterval(() => {
      this.refreshState().catch(() => {
        // refreshState() now handles online/offline transitions
      });
    }, this.pollIntervalMs);
  }

  private failureCount = 0;
  private online = true;

  private async refreshState(): Promise<void> {

    try {

      const status = await this.client.getStatus11();

      if (!this.online) {
        this.online = true;
        this.failureCount = 0;

        this.platform.log.info(
          `[${this.device.name}] Device is back online.`,
        );
      }

      this.failureCount = 0;

      this.applyStatus(status);

    } catch (error) {

      this.failureCount++;

      if (this.failureCount >= 3 && this.online) {

        this.online = false;

        this.platform.log.warn(
          `[${this.device.name}] Device is offline.`,
        );

      }

      throw error;
    }
  }

  private applyStatus(status: TasmotaStatus11): void {

    //
    // POWER
    //

    let newPower = this.isOn;

    if (typeof status.POWER === 'boolean') {
      newPower = status.POWER;
    } else if (typeof status.POWER === 'number') {
      newPower = status.POWER > 0;
    } else if (typeof status.POWER === 'string') {

      const normalized = status.POWER.toUpperCase();

      newPower =
        normalized === 'ON' ||
        normalized === '1' ||
        normalized === 'TRUE';
    }

    if (newPower !== this.isOn) {

      this.isOn = newPower;

      this.platform.log.debug(
        `[${this.device.name}] Power -> ${this.isOn ? 'ON' : 'OFF'}`,
      );

      this.service.updateCharacteristic(
        this.platform.Characteristic.On,
        this.isOn,
      );
    }

    //
    // BRIGHTNESS
    //

    const brightness =
      status.Dimmer ??
      status.DIMMER ??
      status.Brightness;

    if (typeof brightness === 'number') {

      const newBrightness = Math.max(
        1,
        Math.min(100, Math.round(brightness)),
      );

      if (newBrightness !== this.brightness) {

        this.brightness = newBrightness;

        this.platform.log.debug(
          `[${this.device.name}] Brightness -> ${this.brightness}%`,
        );

        this.service.updateCharacteristic(
          this.platform.Characteristic.Brightness,
          this.brightness,
        );
      }
    }
  }
}