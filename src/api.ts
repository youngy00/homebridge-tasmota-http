import { TasmotaHttpPlatform } from './platform';
import { DiscoveredTasmotaDevice } from './discovery';

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

}