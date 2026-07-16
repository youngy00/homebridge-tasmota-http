import http from 'node:http';
import https from 'node:https';
import { Logging } from 'homebridge';
import {
  TasmotaDeviceConfig,
  TasmotaStatus11,
  TasmotaStatusResponse,
} from './types';

export class TasmotaClient {

  private readonly timeoutMs = 5000;

  constructor(
    private readonly device: TasmotaDeviceConfig,
    private readonly log: Logging,
  ) {
  }

  public async getStatus11(): Promise<TasmotaStatus11> {
    const payload =
      await this.request<TasmotaStatusResponse>('Status 11');

    return (
      payload.StatusSTS ??
      payload.Status11 ??
      payload.Status ??
      {}
    ) as TasmotaStatus11;
  }

  public async setPower(on: boolean): Promise<void> {
    await this.request(`Power ${on ? 'ON' : 'OFF'}`);
  }

  public async setBrightness(brightness: number): Promise<void> {

    const clamped =
      Math.max(1, Math.min(100, Math.round(brightness)));

    await this.request(`Dimmer ${clamped}`);
  }

  private request<T>(command: string): Promise<T> {

    const url = this.buildUrl(command);

    return new Promise<T>((resolve, reject) => {

      const start = Date.now();

      this.log.debug(
        `[${this.device.name}] HTTP -> ${command}`,
      );

      const transport =
        url.startsWith('https://')
          ? https
          : http;

      const req = transport.get(url, (res) => {

        let body = '';

        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {

          const elapsed =
            Date.now() - start;

          if (
            res.statusCode &&
            res.statusCode >= 400
          ) {

            this.log.warn(
              `[${this.device.name}] HTTP ${res.statusCode} (${elapsed} ms)`,
            );

            reject(
              new Error(
                `HTTP ${res.statusCode}`,
              ),
            );

            return;
          }

          this.log.debug(
            `[${this.device.name}] HTTP OK (${elapsed} ms)`,
          );

          try {

            resolve(
              JSON.parse(body) as T,
            );

          } catch {

            reject(
              new Error(
                'Unable to parse JSON response.',
              ),
            );
          }
        });
      });

      req.setTimeout(
        this.timeoutMs,
        () => {

          req.destroy();

          this.log.warn(
            `[${this.device.name}] HTTP timeout (${this.timeoutMs} ms)`,
          );

          reject(
            new Error(
              'HTTP timeout',
            ),
          );
        },
      );

      req.on('error', (error) => {

        this.log.warn(
          `[${this.device.name}] ${error.message}`,
        );

        reject(error);
      });

    });
  }

  private buildUrl(
    command: string,
  ): string {

    const port =
      this.device.port ?? 80;

    return `http://${this.device.host}:${port}/cm?cmnd=${encodeURIComponent(command)}`;
  }

}