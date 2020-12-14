const Robotman = require("./core/classes/Client");
const client = new Robotman({
    fetchAllMembers: true,
    restTimeOffset: 250,
    disableMentions: "everyone",
    ws: {
        intents: [
            "GUILDS", 
            "GUILD_MEMBERS", 
            "GUILD_BANS", 
            "GUILD_EMOJIS", 
            "GUILD_INTEGRATIONS", 
            "GUILD_WEBHOOKS", 
            "GUILD_INVITES",
            "GUILD_PRESENCES",
            "GUILD_MESSAGES",
            "GUILD_MESSAGE_REACTIONS"
        ]
    }
});

process.on("unhandledRejection", e => client.log(`Unhandled Promise Rejection: ${e.stack}`, "error", { ping: true }));

client.init();