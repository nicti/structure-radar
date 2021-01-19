const DataTypes = require('sequelize')

module.exports = (sequelize) => {
    sequelize.define('structure',{
        location_id: {
            type: DataTypes.STRING
        },
        character_id: {
            type: DataTypes.STRING
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
        },
        vulnerability: {
            type: DataTypes.STRING
        },
      });
}