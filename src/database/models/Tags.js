module.exports = (db, types) => db.define("tags", {
    guild: types.STRING,
    name: types.STRING,
	contents: types.TEXT,
	createdBy: types.TEXT,
	userID: types.STRING,
	uses: {
		type: types.INTEGER,
		defaultValue: 0,
		allowNull: false,
	},
	aliases: {
        type: types.ARRAY(types.STRING),
        allowNull: false,
        defaultValue: []
    },
	attachments: types.ARRAY(types.TEXT),
	editedBy: types.TEXT,
	editedUserID: types.STRING,
});