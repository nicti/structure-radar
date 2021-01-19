const Sequelize = require('sequelize')

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: 'database.sqlite',
    logging: false
})

require('./user.model')(sequelize)
require('./character.model')(sequelize)
require('./structure.model')(sequelize)
require('./location.model')(sequelize)

const { user,character } = sequelize.models

user.hasMany(character)
character.belongsTo(user)

;(async () => { await sequelize.sync() })()

module.exports = sequelize