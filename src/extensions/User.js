const { Structures } = require("discord.js");

module.exports = Structures.extend("User", User => {
    return class RobotUser extends User {
        constructor(...args) {
            super (...args);
        }

        get owner() {
            return this.id === process.env.OWNER;
        }
    };
});