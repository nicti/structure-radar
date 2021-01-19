require('dotenv').config()

const database = require('./models')
const express = require('express')

const cors = require('cors')
const cookieSession = require('cookie-session')
const cookieParser = require('cookie-parser')

const passport = require('passport')
require('./strategy/eveauth')

const app = express()

const PORT = process.env.PORT || 5000

const { models } = require('./models')

app.use(cors({
    origin: 'https://localhost:8080',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}))

app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET],
    maxAge: 24 * 60 * 60 * 1000
}))

app.use(cookieParser())

app.use(passport.initialize())
app.use(passport.session())


const authenticationCheck = (req, res, next) => {
    if (!req.user) {
        res.status(401).json({
            authenticated: false,
            message: 'Not authenticated'
        })
    } else next()
}

app.get('/', authenticationCheck, (req, res) => {
    res.status(200).json({
        authenticated: true,
        message: 'Authenticated',
        user: req.user,
        cookies: req.cookies
    })
})

app.get('/auth', passport.authenticate('eveOnline'))
app.get('/auth/callback', passport.authenticate('eveOnline',
  {
    successRedirect: process.env.URL,
    failureRedirect: process.env.FAILURE_URL
  }))

  app.get('/structures',async (req, res) => {
      let result = []
      let structures = await models.structure.findAll();
      for (let i = 0; i < structures.length; i++) {
          const structure = structures[i];
          let character = await models.character.findOne({
            where: {
                id: structure.character_id
            }
          });
          let j = result.findIndex(x => x.location_id === structure.location_id);
          if (j === -1) {
            result.push({
                location_id: structure.location_id,
                system: structure.system,
                type_id: structure.type_id,
                name: structure.name,
                corp: structure.corp,
                alli: structure.alli,
                asset_owner: [character.name],
                vulnerability: structure.vulnerability
            });
          } else {
              result[j].asset_owner.push(character.name);
              let a = 'b';
          }        
      }
      res.status(200).json(result);
  })

  app.get('/characters',async (req, res) => {
      let user = req.user.id;
      let characters = await models.character.findAll({
          where: {
              userId: user.toString()
          }
      });
      let list = [];
      for (let i = 0; i < characters.length; i++) {
          const character = characters[i];
          list.push({
              character_id: character.id,
              character_name: character.name
          })
      }
      res.status(200).json(list);
  })

const checkDatabaseConnection = async () => {
    console.log('Checking database connection...')
    try {
        await database.authenticate()
        console.log('Database connection OK!')
    } catch (error) {
        console.log('Unable to connect to the database:')
        console.log(error.message)
        process.exit(1)
    }
}

const init = async () => {
    await checkDatabaseConnection()

    console.log(`Starting server on port ${PORT}...`)

    app.listen(PORT, () => {
        console.log(`Express server started on port ${PORT}.`)
    })
}

init()