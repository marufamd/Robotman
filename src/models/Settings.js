const { DataTypes } = require('sequelize');

module.exports = database => database.define('Settings', {
    guild: DataTypes.STRING,
    settings: DataTypes.JSONB
});

/*
    prefix: null
    disabledCommands: []
    modRoles: []
    adminRoles: []
    logs: {
        message: {
            edits: true,
            deletes: true,
            channel: webhookID
        },
        mod: {
            warns: true,
            mutes: true,
            kicks: true,
            bans: true,
            channel: webhookID
        },
        member: {
            nickname: true,
            roles: true
            channel: webhookID
        },
        join: {
            join: true,
            leave: true,
            channel: webhookID
        },
        server: {
            emojis: true,
            channels: true,
            roles: true,
            channel: webhookID
        }
    }
*/