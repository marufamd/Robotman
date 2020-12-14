module.exports = (db, types) => db.define("shortcuts", {
    name: types.STRING,
	command: types.STRING,
	params: types.TEXT,
	aliases: {
        type: types.ARRAY(types.STRING),
        allowNull: false,
        defaultValue: []
    },
	hidden: types.BOOLEAN,
	dev: types.BOOLEAN
});