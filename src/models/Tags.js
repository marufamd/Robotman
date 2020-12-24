const { DataTypes } = require('sequelize');

module.exports = database => database.define('Tags', {
    guild: DataTypes.STRING,
    name: DataTypes.STRING,
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
    data: DataTypes.JSONB
});

/*
data: {
    content,
    user: {
        name,
        id
    },
    editor: {
        name,
        id
    },
    attachments: []
}
*/