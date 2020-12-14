module.exports = (db, types) => db.define("botUtil", {
    scheduleWebhook: types.STRING,
    scheduleTime: {
        type: types.ARRAY(types.INTEGER),
        allowNull: false,
        defaultValue: []
    },
    commandsUsed: {
        type: types.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    hangmanGames: {
        type: types.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    triviaGames: {
        type: types.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    connectGames: {
        type: types.INTEGER,
        defaultValue: 0,
        allowNull: false,
    },
    akiGames: {
        type: types.INTEGER,
        defaultValue: 0,
        allowNull: false,
    }
});