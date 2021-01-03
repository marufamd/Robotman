const os = require('os');
const { wait } = require('./');

module.exports = class CPU {
    static INTERVAL = 1000;

    static average() {
        let idle = 0,
            total = 0;

        const cpus = os.cpus();

        for (const cpu of cpus) {
            for (const type of Object.keys(cpu.times)) total += cpu.times[type];
            idle += cpu.times.idle;
        }

        return {
            idle: (idle / cpus.length), 
            total: (total / cpus.length)
        };
    }

    static async usage() {
        const start = CPU.average();
        await wait(CPU.INTERVAL);
        const end = CPU.average();

        const idleDiff = (end.idle - start.idle);
        const totalDiff = (end.total - start.total);

        return (10000 - Math.round(10000 * (idleDiff / totalDiff))) / 100;
    }
};