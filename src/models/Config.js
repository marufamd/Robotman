const { DataTypes } = require('sequelize');

module.exports = database => database.define('Config', { data: DataTypes.JSONB });