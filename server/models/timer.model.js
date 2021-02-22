const DataTypes = require('sequelize')

module.exports = (sequelize) => {
    sequelize.define('timer',{
        notification_id: {
            type: DataTypes.STRING
        },
        character_id: {
            type: DataTypes.STRING
        },
        location_id: {
            type: DataTypes.STRING
        },
        location_name: {
            type: DataTypes.STRING
        },
        type_id: {
            type: DataTypes.STRING
        },
        timer: {
            type: DataTypes.STRING
        },
        system: {
            type: DataTypes.STRING
        },
        region: {
            type: DataTypes.STRING
        },
        posted_at: {
            type: DataTypes.STRING
        },
        expires_at: {
            type: DataTypes.STRING
        },
        is_notified_60: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_notified_0: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        is_force_elapsed: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    })
}