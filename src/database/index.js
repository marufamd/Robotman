const Sequelize = require("sequelize");
const { log } = require("../util/logger");

const database = new Sequelize(process.env.DATABASE_URL, { logging: false });
database.authenticate()
    .then(() => log("Connection to database established successfully"))
    .catch(e => log(`Error connecting to database: ${e}`, "error"));

module.exports = {
    settings: require("./models/Settings")(database, Sequelize.DataTypes),
    shortcuts: require("./models/Shortcuts")(database, Sequelize.DataTypes),
    tags: require("./models/Tags")(database, Sequelize.DataTypes),
    util: require("./models/Util")(database, Sequelize.DataTypes)
};