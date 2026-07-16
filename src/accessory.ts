import { CharacteristicValue, PlatformAccessory, Service, Logging } from 'homebridge';
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
    private readonly device: TasmotaDeviceConfig
  ) {
    this.client = new TasmotaClient(device, platform.log);
    this.pollIntervalMs = Math.max(5, device.pollInterval ?? 15) * 1000;

    this.service = this.createService();
    this.setupCharacteristics();
    this.accessory.on('identify', () => this.identify());

    this.refreshState().catch((error) => {
      this.platform.log.error(`Unable to initialize Tasmota state for ${device.name}: ${error}`);
    });
    this.startPolling();
  }

  public identify(): void {
    this.platform.log.info(`Identify requested for ${this.device.name}`);
  }

  private createService(): Service {
    const informationService = this.accessory.getService(this.platform.Service.AccessoryInformation) || this.accessory.addService(this.platform.Service.AccessoryInformation);
    informationService
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Tasmota')
      .setCharacteristic(this.platform.Characteristic.Model, 'HTTP Light')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, `${this.device.host}:${this.device.port ?? 80}`);

    let service = this.accessory.getService(this.platform.Service.Lightbulb);
    if (!service) {
      service = this.accessory.addService(this.platform.Service.Lightbulb, this.device.name, this.device.name);
    }
    service.setCharacteristic(this.platform.Characteristic.Name, this.device.name);
    return service;
  }

  private setupCharacteristics(): void {
    const onCharacteristic = this.service.getCharacteristic(this.platform.Characteristic.On);
    onCharacteristic.onSet((value, callback) => {
      this.handlePowerChange(Boolean(value))
        .then(() => callback())
        .catch((error) => callback(error));
    });
    onCharacteristic.onGet(() => this.isOn);

    const brightnessCharacteristic = this.service.getCharacteristic(this.platform.Characteristic.Brightness);
    brightnessCharacteristic.setProps({
      minValue: 1,
      maxValue: 100,
      minStep: 1,
    });
    brightnessCharacteristic.onSet((value, callback) => {
      this.handleBrightnessChange(Number(value))
        .then(() => callback())
        .catch((error) => callback(error));
    });
    brightnessCharacteristic.onGet(() => this.brightness);
  }

  private async handlePowerChange(on: boolean): Promise<void> {
    await this.client.setPower(on);
    this.isOn = on;
    this.service.updateCharacteristic(this.platform.Characteristic.On, on);
  }

  private async handleBrightnessChange(brightness: number): Promise<void> {
    const clampedBrightness = Math.max(1, Math.min(100, Math.round(brightness)));
    await this.client.setBrightness(clampedBrightness);
    this.brightness = clampedBrightness;
    this.isOn = true;
    this.service.updateCharacteristic(this.platform.Characteristic.Brightness, clampedBrightness);
    this.service.updateCharacteristic(this.platform.Characteristic.On, true);
  }

  private startPolling(): void {
    this.pollingTimer = setInterval(() => {
      this.refreshState().catch((error) => {
        this.platform.log.error(`Unable to refresh Tasmota state for ${this.device.name}: ${error}`);
      });
    }, this.pollIntervalMs);
  }

  private async refreshState(): Promise<void> {
    const status = await this.client.getStatus11();
    this.applyStatus(status);
  }

  private applyStatus(status: TasmotaStatus11): void {
    if (typeof status.POWER === 'boolean') {
      this.isOn = status.POWER;
      this.service.updateCharacteristic(this.platform.Characteristic.On, this.isOn);
    } else if (typeof status.POWER === 'number') {
      this.isOn = status.POWER > 0;
      this.service.updateCharacteristic(this.platform.Characteristic.On, this.isOn);
    } else if (typeof status.POWER === 'string') {
      const normalized = status.POWER.toUpperCase();
      this.isOn = normalized === 'ON' || normalized === '1' || normalized === 'TRUE';
      this.service.updateCharacteristic(this.platform.Characteristic.On, this.isOn);
    }

    const brightness = status.DIMMER ?? status.Brightness;
    if (typeof brightness === 'number') {
      this.brightness = Math.max(1, Math.min(100, Math.round(brightness)));
      this.service.updateCharacteristic(this.platform.Characteristic.Brightness, this.brightness);
    }
  }
}
