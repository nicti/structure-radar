<template>
  <v-app>
    <v-app-bar
      app
      color="secondary"
    >
      <div class="d-flex align-center">
        <v-img
          alt="Upwell"
          class="shrink mt-2 mb-2"
          contain
          min-width="90"
          :src="require('./assets/upwell.png')"
          width="90"
        />
        <p style="font-size: 20px">+</p>
        <v-img
          alt="BLPI"
          class="shrink mt-2 mb-2"
          contain
          min-width="60"
          :src="require('./assets/blpi.png')"
          width="60"
        />
      </div>

      <v-spacer></v-spacer>

      <v-btn icon v-on:click="toggle_dark_mode">
        <v-icon>mdi-theme-light-dark</v-icon>
      </v-btn>
      
      <v-btn
        :href="loginUrl"
        text
        v-if="!userId"
      >
        <span class="mr-2">Login into EVE</span>
      </v-btn>
      <v-img
        :src="getCharacterImage(userId)"
        max-height="48"
        max-width="48"
        v-on:click="drawer = !drawer"
        style="cursor: pointer;"
      />
      <v-btn
        :href="loginUrl"
        text
        v-if="accessLevel === 3"
      >
        <span class="mr-2">Add...</span>
      </v-btn>
    </v-app-bar>

    <v-navigation-drawer
      v-model="drawer"
      absolute
      temporary
      right
      v-if="accessLevel >= 3"
    >
    <v-list
      nav
      dense
      >
      <h3 class="font-weight-bold mb-3 ">
          Registered characters:
        </h3>
      <v-list-item v-for="item in characters" :key="item.character_id">
        <v-img
          :src="getCharacterImage(item.character_id)"
          max-height="48"
          max-width="48"
          class="mr-1"
        ></v-img>
        
        <v-list-item-content>
            <v-list-item-title>{{ item.character_name }}</v-list-item-title>
            <v-checkbox dense class="mt-0 ml-2" :label="`Spy`" @change="characterSpy($event, item.character_id)" v-model="item.spy"></v-checkbox>
          </v-list-item-content>
      </v-list-item>
    </v-list>
    </v-navigation-drawer>

    <v-main>
      <router-view></router-view>
    </v-main>
  </v-app>
</template>

<script>
import axios from 'axios'
export default {
  name: 'App',

  components: {
  },

  data: () => ({
    loginUrl: process.env.VUE_APP_AUTH_URL,
    userId: false,
    characters: [],
    drawer: false,
    beUrl: process.env.VUE_APP_BE_URL,
    accessLevel: 0
    }),
  methods: {
    toggle_dark_mode: function () {
      this.$vuetify.theme.dark = !this.$vuetify.theme.dark;
      localStorage.setItem("dark_theme", this.$vuetify.theme.dark.toString());
    },
    getCharacterImage(id) {
      return 'https://images.evetech.net/characters/'+id+'/portrait?size=64'
    },
    characterSpy(newVal, id) {
      axios.post(this.beUrl+'/character/'+id+'/spy',{spy: newVal},{withCredentials: true});
    }
  },
  mounted() {
    const theme = localStorage.getItem("dark_theme");
    if (theme) {
        if (theme == "true") {
            this.$vuetify.theme.dark = true;
        } else {
            this.$vuetify.theme.dark = false;
        }
    }
    axios.get(this.beUrl+'/',{withCredentials: true})
    .then((response) => {
      this.userId = response.data.user.id
      axios.get(this.beUrl+'/allowed/'+this.userId,{withCredentials: true}).then((response) => {
        this.accessLevel = response.data.level;
      });
    })
    .catch((error) => {
      console.log(error)
      this.userId = false
    })
    axios.get(this.beUrl+'/characters',{withCredentials: true})
    .then((response) => {
      this.characters = response.data;
    })
    .catch(() => {
      this.characters = []
    });
  }
};
</script>
