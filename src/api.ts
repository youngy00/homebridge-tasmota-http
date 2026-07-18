import { TasmotaHttpPlatform } from './platform';
import { DiscoveredTasmotaDevice } from './discovery';
import { TasmotaDeviceConfig } from './types';

export class TasmotaApi {

  constructor(
    private readonly platform: TasmotaHttpPlatform,
  ) {}

  public async scan(): Promise<DiscoveredTasmotaDevice[]> {

    await this.platform.runDiscovery();

    return this.platform.getDiscoveredDevices();

  }

  public list(): DiscoveredTasmotaDevice[] {

    return this.platform.getDiscoveredDevices();

  }

public import(
  host: string,
): Promise<TasmotaDeviceConfig | undefined> {

  return this.platform.importDevice(host);

}
}