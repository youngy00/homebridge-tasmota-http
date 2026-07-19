export type DeviceType = 'light' | 'switch';

export interface UiDevice {
  name: string;
  host: string;
  configured: boolean;
  suggestedType: DeviceType;
}

export interface PluginDevice {
  name: string;
  host: string;
  port: number;
  pollInterval: number;
  type?: DeviceType;
}

export interface PlatformConfigBlock {
  platform: string;
  scanSubnet?: string;
  devices?: PluginDevice[];
  [key: string]: unknown;
}
