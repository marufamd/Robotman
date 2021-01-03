const os = require('os');
const { wait } = require('./');

const INTERVAL = 1000;

module.exports = class CPU {
    static average() {
        let idle = 0,
            total = 0;

        const cpus = os.cpus();

        for (const cpu of cpus) {
            for (const type in cpu.times) total += cpu.times[type];
            idle += cpu.times.idle;
        }

        return {
            idle: (idle / cpus.length), 
            total: (total / cpus.length)
        };
    }

    static async usage() {
        const start = this.average();
        await wait(INTERVAL);
        const end = this.average();

        const idleDiff = (end.idle - start.idle);
        const totalDiff = (end.total - start.total);

        return (10000 - Math.round(10000 * (idleDiff / totalDiff))) / 100;
    }
};