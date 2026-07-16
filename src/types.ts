import { PlatformConfig } from 'homebridge';

export interface TasmotaPlatformConfig extends PlatformConfig {
  devices: TasmotaDeviceConfig[];
  scanSubnet?: string;
}

export interface TasmotaDeviceConfig {
  name: string;
  host: string;
  port?: number;
  pollInterval?: number;
}

export interface TasmotaStatus11 {
  POWER?: string | number | boolean;

  // Different Tasmota firmware versions
  Dimmer?: number;
  DIMMER?: number;
  Brightness?: number;

  White?: number;
  CT?: number;
  Color?: string;

  Wifi?: {
    RSSI?: number;
    Signal?: number;
  };

  [key: string]: unknown;
}

export interface TasmotaStatusResponse {
  StatusSTS?: TasmotaStatus11;
  Status11?: TasmotaStatus11;
  Status?: TasmotaStatus11;

  [key: string]: unknown;
}