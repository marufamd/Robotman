import os from 'os';
import { KVObject, wait } from './';

interface CPUAverageInfo {
    idle: number;
    total: number;
}

export default class CPU {
    private static readonly interval = 1000;

    private static average(): CPUAverageInfo {
        let idle = 0;
        let total = 0;

        const cpus = os.cpus();

        for (const cpu of cpus) {
            for (const type of Object.keys(cpu.times)) total += (cpu.times as KVObject)[type];
            idle += cpu.times.idle;
        }

        return {
            idle: (idle / cpus.length),
            total: (total / cpus.length)
        };
    }

    public static async usage() {
        const start = this.average();
        await wait(this.interval);
        const end = this.average();

        const idleDiff = (end.idle - start.idle);
        const totalDiff = (end.total - start.total);

        return (10000 - Math.round(10000 * (idleDiff / totalDiff))) / 100;
    }
}