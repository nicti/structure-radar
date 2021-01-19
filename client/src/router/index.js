import Vue from 'vue'
import VueRouter from 'vue-router'
import Home from '../views/Home.vue'
import axios from 'axios'

Vue.use(VueRouter)

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/callback',
    name: 'Callback',
    beforeEnter: (to, from, next) => {
      if (to.query['code']) {
        axios.post(
          'https://login.eveonline.com/oauth/token',
          {
            "grant_type": "authorization_code",
            "code": to.query['code']
          },
          {
            headers: {
              'Authorization': 'Basic ' + Buffer(process.env.VUE_APP_CLIENT_ID + ':' + process.env.VUE_APP_SECRET_KEY).toString('base64')
            }
          }
        ).then((response) => {
          console.log(response)

        }).catch((error) => {
          console.log(error)
        })
      }
      console.log(to)
      console.log(from)
      console.log(next)
    }
  }
]

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes
})

export default router
