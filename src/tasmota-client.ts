import http from 'node:http';
import https from 'node:https';
import { Logging } from 'homebridge';
import { TasmotaDeviceConfig, TasmotaStatus11, TasmotaStatusResponse } from './types';

export class TasmotaClient {
  constructor(
    private readonly device: TasmotaDeviceConfig,
    private readonly log: Logging
  ) {}

  public async getStatus11(): Promise<TasmotaStatus11> {
    const payload = await this.request<TasmotaStatusResponse>('Status 11');
    const status = payload.StatusSTS ?? payload.Status11 ?? payload.Status ?? {};
    return status as TasmotaStatus11;
  }

  public async setPower(on: boolean): Promise<void> {
    await this.request(`Power ${on ? 'ON' : 'OFF'}`);
  }

  public async setBrightness(brightness: number): Promise<void> {
    const clamped = Math.max(1, Math.min(100, Math.round(brightness)));
    await this.request(`Dimmer ${clamped}`);
  }

  private request<T>(command: string): Promise<T> {
    const url = this.buildUrl(command);
    this.log.debug(`Tasmota request -> ${url}`);

    return new Promise<T>((resolve, reject) => {
      const transport = url.startsWith('https://') ? https : http;
      const req = transport.get(url, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`Tasmota request failed with HTTP ${res.statusCode}`));
            return;
          }

          try {
            resolve(JSON.parse(body) as T);
          } catch (error) {
            reject(new Error(`Unable to parse Tasmota response: ${body}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy(new Error('Tasmota request timeout'));
      });
      req.on('error', reject);
      req.setTimeout(5000);
    });
  }

  private buildUrl(command: string): string {
    const port = this.device.port ?? 80;
    return `http://${this.device.host}:${port}/cm?cmnd=${encodeURIComponent(command)}`;
  }
}
