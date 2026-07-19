import type { PlatformConfigBlock } from './types';

declare global {
  interface Window {
    homebridge: {
      request<T = unknown>(path: string, body?: unknown): Promise<T>;
      getPluginConfig(): Promise<PlatformConfigBlock[]>;
      updatePluginConfig(
        pluginConfig: PlatformConfigBlock[],
      ): Promise<PlatformConfigBlock[]>;
      savePluginConfig(): Promise<void>;
      toast: {
        success(message: string, title?: string): void;
        error(message: string, title?: string): void;
      };
    };
  }
}

const PLATFORM_NAME = 'TasmotaHttp';

export function request<T>(path: string, body?: unknown): Promise<T> {
  return window.homebridge.request<T>(path, body);
}

/**
 * Adds (or updates) a device in the TasmotaHttp platform block and persists
 * it via the official Homebridge UI config SDK. This goes through the same
 * getPluginConfig -> updatePluginConfig -> savePluginConfig flow the main
 * "Settings" form uses, so it can't race with, or clobber, a save the user
 * makes elsewhere in the UI at the same time.
 */
export async function importDevice(
  host: string,
  name: string,
): Promise<'imported' | 'already-configured'> {

  const pluginConfig = await window.homebridge.getPluginConfig();

  let platform = pluginConfig.find(
    block => block.platform === PLATFORM_NAME,
  );

  if (!platform) {
    platform = { platform: PLATFORM_NAME, devices: [] };
    pluginConfig.push(platform);
  }

  platform.devices ??= [];

  const existing = platform.devices.find(device => device.host === host);

  if (existing) {
    return 'already-configured';
  }

  platform.devices.push({
    name,
    host,
    port: 80,
    pollInterval: 2,
  });

  await window.homebridge.updatePluginConfig(pluginConfig);
  await window.homebridge.savePluginConfig();

  return 'imported';
}
