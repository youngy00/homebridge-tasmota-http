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
 *
 * Calls are chained onto `importQueue` so that importing several devices in
 * quick succession (clicking multiple "Import" buttons before the first
 * save lands) can't race: each import only reads the config once the
 * previous import has fully saved, instead of reading a stale snapshot and
 * overwriting the previous import's change when it saves.
 */
let importQueue: Promise<void> = Promise.resolve();

export function importDevice(
  host: string,
  name: string,
): Promise<'imported' | 'already-configured'> {

  const result = importQueue.then(() => doImportDevice(host, name));

  importQueue = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}

async function doImportDevice(
  host: string,
  name: string,
): Promise<'imported' | 'already-configured'> {

  window.homebridge?.toast?.success(
    `Fetching current config for ${name}...`,
    'Debug: import starting',
  );

  const pluginConfig = await window.homebridge.getPluginConfig();

  let platform = pluginConfig.find(
    block => block.platform === PLATFORM_NAME,
  );

  window.homebridge?.toast?.success(
    platform
      ? `Found TasmotaHttp block with ${platform.devices?.length ?? 0} device(s).`
      : 'No TasmotaHttp block found in config - creating one.',
    'Debug: config read',
  );

  if (!platform) {
    platform = { platform: PLATFORM_NAME, devices: [] };
    pluginConfig.push(platform);
  }

  platform.devices ??= [];

  const existing = platform.devices.find(device => device.host === host);

  if (existing) {

    window.homebridge?.toast?.success(
      `${host} is already in the config - skipping.`,
      'Debug: already configured',
    );

    return 'already-configured';
  }

  platform.devices.push({
    name,
    host,
    port: 80,
    pollInterval: 2,
  });

  window.homebridge?.toast?.success(
    `Saving ${platform.devices.length} device(s), including ${name} (${host}).`,
    'Debug: about to save',
  );

  await window.homebridge.updatePluginConfig(pluginConfig);
  await window.homebridge.savePluginConfig();

  window.homebridge?.toast?.success(
    `Save call for ${name} completed.`,
    'Debug: saved',
  );

  return 'imported';
}
