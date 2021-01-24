import os from 'os';
import { wait } from '.';

const INTERVAL = 1000;

interface CPUAverage {
    idle: number;
    total: number;
}

function average(): CPUAverage {
    let idle = 0;
    let total = 0;

    const cpus = os.cpus();

    for (const cpu of cpus) {
        for (const type of Object.keys(cpu.times)) total += (cpu.times as Record<string, number>)[type];
        idle += cpu.times.idle;
    }

    return {
        idle: (idle / cpus.length),
        total: (total / cpus.length)
    };
}

export default async function usage() {
    const start = average();
    await wait(INTERVAL);
    const end = average();

    const idleDiff = (end.idle - start.idle);
    const totalDiff = (end.total - start.total);

    return (10000 - Math.round(10000 * (idleDiff / totalDiff))) / 100;
}