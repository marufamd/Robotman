module.exports = (db, DataTypes) => db.define("Tags", {
    guild: DataTypes.STRING,
    name: DataTypes.STRING,
    contents: DataTypes.TEXT,
	user: DataTypes.JSONB,
    editor: DataTypes.JSONB,
	uses: {
		type: DataTypes.INTEGER,
		defaultValue: 0,
		allowNull: false,
	},
	aliases: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
        allowNull: false,
    },
	attachments: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        defaultValue: [],
        allowNull: false,
    }
});