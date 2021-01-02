const os = require('os');
const { wait } = require('./');

module.exports = class CPU {
    static interval = 1000;

    static average() {
        let idle = 0,
            tick = 0;

        const cpus = os.cpus();

        for (const cpu of cpus) {
            for (const type in cpu.times) tick += cpu.times[type];
            idle += cpu.times.idle;
        }

        return {
            idle: (idle / cpus.length), 
            total: (tick / cpus.length)
        };
    }

    static async usage() {
        const start = this.average();
        await wait(this.interval);
        const end = this.average();

        const idleDiff = (end.idle - start.idle);
        const totalDiff = (end.total - start.total);

        return (10000 - Math.round(10000 * (idleDiff / totalDiff))) / 100;
    }
};