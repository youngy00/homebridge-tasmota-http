export interface Logger {
    info(message: string): void;
}
export interface DiscoveredTasmotaDevice {
    ip: string;
    friendlyName: string;
    hostname: string;
    module: string;
    version: string;
    power: boolean;
    dimmer: boolean;
    rgb: boolean;
    colorTemperature: boolean;
    suggestedType: 'light' | 'switch' | 'outlet' | 'fan' | 'unknown';
}
export declare class TasmotaDiscovery {
    private readonly log;
    private readonly timeout;
    private readonly concurrency;
    constructor(log: Logger, timeout?: number);
    discoverHost(ip: string): Promise<DiscoveredTasmotaDevice | null>;
    scanSubnet(subnet: string): Promise<DiscoveredTasmotaDevice[]>;
    private determineType;
    private request;
}
