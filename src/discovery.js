"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasmotaDiscovery = void 0;
const node_http_1 = __importDefault(require("node:http"));
class TasmotaDiscovery {
    constructor(log, timeout = 1000) {
        this.log = log;
        this.timeout = timeout;
        this.concurrency = 25;
    }
    async discoverHost(ip) {
        const [status0, status11] = await Promise.all([
            this.request(ip, 'Status 0'),
            this.request(ip, 'Status 11'),
        ]);
        if (!status0?.Status) {
            return null;
        }
        const sts = status11?.StatusSTS ??
            status11?.Status11 ??
            {};
        const hasPower = sts.POWER !== undefined;
        const hasDimmer = sts.Dimmer !== undefined ||
            sts.DIMMER !== undefined;
        const hasColor = sts.Color !== undefined;
        const hasCT = sts.CT !== undefined;
        return {
            ip,
            friendlyName: status0.Status.FriendlyName?.[0] ??
                'Unknown',
            hostname: status0.Status.DeviceName ??
                status0.Status.Hostname ??
                '',
            module: status0.Status.Module ??
                'Unknown',
            version: status0.Status.Version ??
                'Unknown',
            power: hasPower,
            dimmer: hasDimmer,
            rgb: hasColor,
            colorTemperature: hasCT,
            suggestedType: this.determineType(hasPower, hasDimmer, hasColor, hasCT),
        };
    }
    async scanSubnet(subnet) {
        const results = [];
        let currentIp = 1;
        const worker = async () => {
            while (currentIp <= 254) {
                const host = currentIp++;
                const ip = `${subnet}.${host}`;
                const device = await this.discoverHost(ip);
                if (device) {
                    this.log.info(`Discovered ${device.friendlyName} (${device.ip})`);
                    results.push(device);
                }
            }
        };
        const workers = [];
        for (let i = 0; i < this.concurrency; i++) {
            workers.push(worker());
        }
        await Promise.all(workers);
        results.sort((a, b) => a.ip.localeCompare(b.ip, undefined, {
            numeric: true,
        }));
        return results;
    }
    determineType(power, dimmer, rgb, ct) {
        if (dimmer || rgb || ct) {
            return 'light';
        }
        if (power) {
            return 'switch';
        }
        return 'unknown';
    }
    request(ip, command) {
        const url = `http://${ip}/cm?cmnd=${encodeURIComponent(command)}`;
        return new Promise((resolve) => {
            const req = node_http_1.default.get(url, (res) => {
                let body = '';
                res.on('data', (chunk) => {
                    body += chunk;
                });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(body));
                    }
                    catch {
                        resolve(null);
                    }
                });
            });
            req.setTimeout(this.timeout, () => {
                req.destroy();
                resolve(null);
            });
            req.on('error', () => {
                resolve(null);
            });
        });
    }
}
exports.TasmotaDiscovery = TasmotaDiscovery;
//# sourceMappingURL=discovery.js.map