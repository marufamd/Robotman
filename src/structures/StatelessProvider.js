module.exports = class StatelessProvider {
    constructor(table) {
        this.table = table;
    }

    get() {
        throw new Error('No get method has been set.');
    }

    set() {
        throw new Error('No set method has been set.');
    }
};