
const EVEStrategy = require('passport-eve-oauth2').Strategy
const passport = require('passport')
const { models } = require('../models')

passport.serializeUser((user, done) => {
  done(null, user.id)
})
passport.deserializeUser(async (id, done) => {
  try {
    const user = await models.user.findOne(
      {
        where: { id: id }
      })
    if (user === null) {
      done(null, null);
    } else {
      done(null, user.toJSON())
    }
  } catch (err) {
    console.error(err)
    done(err, null)
  }
})

passport.use(new EVEStrategy({
  clientID: process.env.ESI_CLIENT_ID,
  clientSecret: process.env.ESI_CLIENT_SECRET,
  callbackURL: process.env.ESI_CALLBACK_URL,
  state: Math.random().toString(36).substring(7),
  passReqToCallback: true,
  scope: 'esi-universe.read_structures.v1 esi-assets.read_assets.v1 esi-characters.read_notifications.v1 esi-search.search_structures.v1'
}, async (req, accessToken, refreshToken, profile, done) => {
  try {
    if (!process.env.ALLOWED.split(',').includes(profile.CharacterID.toString())) {
      done(null,null);
    }
    let character, user
    if (req.user) {
      character = await models.character.findOrCreate({
        where: {
          userId: req.user.id,
          id: profile.CharacterID,
          name: profile.CharacterName
        },
        defaults: {
          accessToken: accessToken,
          refreshToken: refreshToken
        }
      })
      user = await models.user.findOne({
        where: {
          id: req.user.id
        }
      })
    } else {
      user = await models.user.findOrCreate({
        where: {
          id: profile.CharacterID
        }
      })
      if (!user) {
        character = await models.character.create({
          userId: user[0].id,
          id: profile.CharacterID,
          name: profile.CharacterName,
          accessToken: accessToken,
          refreshToken: refreshToken
      })
      }
      user = user[0]
    }
    done(null, user.toJSON())
  } catch (err) {
    console.error(err)
    done(err, null)
  }
}))