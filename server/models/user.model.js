const DataTypes = require('sequelize')

module.exports = (sequelize) => {
    sequelize.define('user',{
        id: {
          type: DataTypes.STRING,
          unique: true,
          primaryKey: true,
          omitNull: true
        }
      });
}