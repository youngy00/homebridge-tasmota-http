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
 * Both importDevice and removeDevice do a getPluginConfig -> mutate ->
 * updatePluginConfig -> savePluginConfig round trip. Every call - import or
 * remove - is chained onto this single queue so an import and a remove (or
 * two of either) triggered close together can't race: each one only reads
 * the config once the previous mutation has fully saved, instead of reading
 * a stale snapshot and clobbering the previous change when it saves.
 */
let configQueue: Promise<void> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {

  const result = configQueue.then(task);

  configQueue = result.then(
    () => undefined,
    () => undefined,
  );

  return result;
}

/**
 * Adds a device to the TasmotaHttp platform block and persists it via the
 * official Homebridge UI config SDK. This goes through the same
 * getPluginConfig -> updatePluginConfig -> savePluginConfig flow the main
 * "Settings" form uses, so it can't race with, or clobber, a save the user
 * makes elsewhere in the UI at the same time.
 */
export function importDevice(
  host: string,
  name: string,
): Promise<'imported' | 'already-configured'> {
  return enqueue(() => doImportDevice(host, name));
}

/** Removes a device from the TasmotaHttp platform block, same save flow as importDevice. */
export function removeDevice(host: string): Promise<'removed' | 'not-found'> {
  return enqueue(() => doRemoveDevice(host));
}

async function doImportDevice(
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

async function doRemoveDevice(
  host: string,
): Promise<'removed' | 'not-found'> {

  const pluginConfig = await window.homebridge.getPluginConfig();

  const platform = pluginConfig.find(
    block => block.platform === PLATFORM_NAME,
  );

  const index = platform?.devices?.findIndex(
    device => device.host === host,
  ) ?? -1;

  if (!platform?.devices || index === -1) {
    return 'not-found';
  }

  platform.devices.splice(index, 1);

  await window.homebridge.updatePluginConfig(pluginConfig);
  await window.homebridge.savePluginConfig();

  return 'removed';
}
