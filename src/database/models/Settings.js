module.exports = (db, types) => db.define("guildSettings", {
    guild: types.STRING,
    prefix: types.STRING,
    disabledCommands: {
        type: types.ARRAY(types.STRING),
        allowNull: false,
        defaultValue: []
    },
    modRoles: {
        type: types.ARRAY(types.STRING),
        allowNull: false,
        defaultValue: []
    },
    adminRoles: {
        type: types.ARRAY(types.STRING),
        allowNull: false,
        defaultValue: []
    },
    modLog: types.STRING,
    messageLog: types.STRING,
    memberLog: types.STRING,
    serverLog: types.STRING,
    joinLeaveLog: types.STRING
});