const { DataTypes } = require('sequelize');

module.exports = database => database.define('Stats', { stats: DataTypes.JSONB });