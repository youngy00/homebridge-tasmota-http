import { API } from 'homebridge';
import { PLUGIN_NAME, PLATFORM_NAME, TasmotaHttpPlatform } from './platform';

export = (api: API): void => {
  api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, TasmotaHttpPlatform);
};
