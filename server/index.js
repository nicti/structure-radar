require('dotenv').config()

const database = require('./models')
const https = require('https')
const fs = require('fs')
const express = require('express')
const bodyParse = require('body-parser')

const axios = require('axios');

const esi = axios.create({
    baseURL: 'https://esi.evetech.net',
});

const cors = require('cors')
const cookieSession = require('cookie-session')
const cookieParser = require('cookie-parser')

const passport = require('passport')
require('./strategy/eveauth')

const app = express()

const PORT = process.env.PORT || 5000

const { models } = require('./models')

app.use(cors({
    origin: process.env.URL,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true
}))

app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET],
    maxAge: 24 * 60 * 60 * 1000
}))

app.use(cookieParser())
app.use(bodyParse.json())

app.use(passport.initialize())
app.use(passport.session())


async function getAccessLevel(id) {
    let accessLevel = 0;
    if (id !== 'false') {
        accessLevel = 1;
    } else if (id === 'false') {
        return 0;
    }
    let char = await esi.get('/v4/characters/'+id+'/');
    let corpId = char.data.corporation_id;
    if (typeof corpId !== "undefined") {
        corpId = corpId.toString();
    } else {
        corpId = null;
    }
    let alliId = char.data.alliance_id;
    if (typeof alliId !== "undefined") {
        alliId = alliId.toString();
    } else {
        alliId = null;
    }
    if (process.env.VIEW_CHAR.split(',').includes(id.toString()) ||
        process.env.VIEW_CORP.split(',').includes(corpId) ||
        process.env.VIEW_ALLI.split(',').includes(alliId)) {
        accessLevel = 2;
    }
    if (process.env.ALLOWED.split(',').includes(id)) {
        accessLevel = 3;
    }
    return accessLevel;
}

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

app.get('/auth', (req, res, next) => {
    if (req.user) {
        passport.authenticate('eveOnline')(req, res, next)
    } else {
        passport.authenticate('eveOnline',{scope: 'publicData'})(req, res, next)
    }
})
app.get('/auth/callback', passport.authenticate('eveOnline',
  {
    successRedirect: process.env.URL,
    failureRedirect: process.env.FAILURE_URL
  }))

  app.get('/structures',authenticationCheck, async (req, res) => {
    let user = req.user.id;
    if (await getAccessLevel(user) < 2) {
        res.status(403).send();
        return;
    }
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
                region: structure.region,
                type_id: structure.type_id,
                name: structure.name,
                corp: structure.corp,
                alli: structure.alli,
                vulnerability: structure.vulnerability
            });
          }
      }
      res.status(200).json(result);
  })

  app.post('/character/:id/spy',authenticationCheck, async (req, res) => {
    let user = req.user.id;
    if (await getAccessLevel(user) < 3) {
        res.status(403).send();
        return;
    }
      id = req.params.id;
      let char = await models.character.findOne({where: {
          userId: req.user.id,
          id: id
      }});
      char.spy = req.body.spy;
      char.save();
      res.status(200).send();
  })

  app.get('/elapsedtimers', authenticationCheck, async (req, res) => {
    let user = req.user.id;
    if (await getAccessLevel(user) < 2) {
        res.status(403).send();
        return;
    }
    let result = [];
      let timers = await models.timer.findAll();
      for (let i = 0; i < timers.length; i++) {
          const timer = timers[i];
          let timerExpires = new Date(timer.expires_at+' UTC');
          let date = new Date();
          date.setUTCDate(date.getUTCDate()-1);
          if (timerExpires.getTime() > date.getTime()) {
              continue;
          }
          result.push({
              location_id: timer.location_id,
              name: timer.location_name,
              type_id: timer.type_id,
              system: timer.system,
              region: timer.region,
              timer: timer.timer,
              posted: timer.posted_at,
              expires: timer.expires_at
          });
      }
      res.status(200).json(result);
  })

  app.get('/timers',authenticationCheck, async (req, res) => {
    let user = req.user.id;
    if (await getAccessLevel(user) < 2) {
        res.status(403).send();
        return;
    }
    let result = [];
    let timers = await models.timer.findAll();
    for (let i = 0; i < timers.length; i++) {
        const timer = timers[i];
        let timerExpires = new Date(timer.expires_at+' UTC');
        let date = new Date();
        date.setUTCDate(date.getUTCDate()-1);
        if (timerExpires.getTime() <= date.getTime()) {
            continue;
        }
        result.push({
            location_id: timer.location_id,
            name: timer.location_name,
            type_id: timer.type_id,
            system: timer.system,
            region: timer.region,
            timer: timer.timer,
            posted: timer.posted_at,
            expires: timer.expires_at
        });
    }
    res.status(200).json(result);
  });

  app.get('/characters',authenticationCheck, async (req, res) => {
      let user = req.user.id;
      if (await getAccessLevel(user) < 3) {
          res.status(403).send();
          return;
      }
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
              character_name: character.name,
              spy: character.spy
          })
      }
      res.status(200).json(list);
  })
  
  app.get('/allowed/:id', authenticationCheck, async (req, res) => {
    let id = req.params.id;
    let accessLevel = await getAccessLevel(id);
    res.status(200).json({level: accessLevel});
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

    if (fs.existsSync('key.pem') && fs.existsSync('cert.pem') && fs.existsSync('ca.pem')) {
        https.createServer({
            key: fs.readFileSync('key.pem','utf8'),
            cert: fs.readFileSync('cert.pem','utf8'),
            ca: fs.readFileSync('ca.pem','utf8')
        },app).listen(PORT, () => {
            console.log(`Express server started on port ${PORT}.`)
        });
    } else {
        app.listen(PORT,() => {
            console.log(`Express server started on port ${PORT}.`)
        });
    }
    
}

init()