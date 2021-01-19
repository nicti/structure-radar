const DataTypes = require('sequelize')

module.exports = (sequelize) => {
    sequelize.define('location',{
        location_id: {
            type: DataTypes.STRING,
            unique: true,
            primaryKey: true
        },
        system: {
            type: DataTypes.STRING
        },
        type_id: {
            type: DataTypes.STRING
        },
        name: {
            type: DataTypes.STRING
        },
        corp: {
            type: DataTypes.STRING
        },
        alli: {
            type: DataTypes.STRING
        }
    })
}