const { DataTypes } = require('sequelize')

module.exports = (sequelize) => {
  sequelize.define('character', {
    id: {
      allowNull: false,
      type: DataTypes.BIGINT,
      unique: true,
      primaryKey: true
    },
    name: {
      allowNull: false,
      type: DataTypes.STRING,
      unique: true
    },
    accessToken: {
      allowNull: false,
      type: DataTypes.STRING
    },
    refreshToken: {
      allowNull: false,
      type: DataTypes.STRING
    },
    spy: {
      allowNull: false,
      type: DataTypes.BOOLEAN
    }
  })
}