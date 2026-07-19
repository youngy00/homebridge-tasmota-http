export interface UiDevice {
  name: string;
  host: string;
  configured: boolean;
}

export interface PluginDevice {
  name: string;
  host: string;
  port: number;
  pollInterval: number;
}

export interface PlatformConfigBlock {
  platform: string;
  scanSubnet?: string;
  devices?: PluginDevice[];
  [key: string]: unknown;
}
