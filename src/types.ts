export interface TasmotaDeviceConfig {
  name: string;
  host: string;
  port?: number;
  pollInterval?: number;
}

export interface TasmotaStatus11 {
  POWER?: string | number | boolean;
  DIMMER?: number;
  Brightness?: number;
  [key: string]: unknown;
}

export interface TasmotaStatusResponse {
  StatusSTS?: TasmotaStatus11;
  Status11?: TasmotaStatus11;
  Status?: TasmotaStatus11;
  [key: string]: unknown;
}
