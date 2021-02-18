<template>
  <v-container fluid>
    <v-row class="text-center" v-if="!this.$parent.$parent.$parent.userId">
      <v-col cols="12">
        <v-img
          :src="require('../assets/fyn.png')"
          class="my-3"
          contain
          height="200"
        />
      </v-col>

      <v-col class="mb-4">
        <h1 class="display-2 font-weight-bold mb-3">
          We yoink your structures!
        </h1>
      </v-col>
    </v-row>
    <div v-if="this.$parent.$parent.$parent.userId">
      <v-tabs>
        <v-tab>Timers</v-tab>
        <v-tab>Tracked structures</v-tab>
        <v-tab-item class="px-2">
          <v-row>
            <v-col cols="4">
              <h2 class="display-1 font-weight-bold mt-2">
                Timers:
              </h2>
            </v-col>
            <v-spacer></v-spacer>
            <v-col cols="4">
              <v-text-field
              v-model="searchTimer"
              append-icon="mdi-magnify"
              label="Search"
              single-line
              hide-details
            ></v-text-field>
            </v-col>
          </v-row>
          <v-row class="text-center">
            <v-col cols="12">
              <v-data-table
                :headers="timerHeaders"
                :items="timerItems"
                :search="searchTimer"
                :sort-by.sync="timerSort"
              >
              <template v-slot:item.type_id="{ item }">
                <v-img
                :src="getTypeRender(item.type_id)"
                max-height="32"
                max-width="32"
                ></v-img>
              </template>
              <template v-slot:item.countdown="{ item }">
                <p class="countdown" :target="item.expires"></p>
              </template>
              </v-data-table>
            </v-col>
          </v-row>
        </v-tab-item>
        <v-tab-item class="px-2">
          <v-row>
            <v-col cols="4">
              <h2 class="display-1 font-weight-bold mt-3">
                Tracked structures:
              </h2>
            </v-col>
            <v-spacer></v-spacer>
            <v-col cols="4">
              <v-text-field
              v-model="searchStructure"
              append-icon="mdi-magnify"
              label="Search"
              single-line
              hide-details
            ></v-text-field>
            </v-col>
          </v-row>
          <v-row class="text-center">
            <v-col cols="12">
              <v-data-table
                :headers="headers"
                :items="items"
                :search="searchStructure"
              >
              <template v-slot:item.type_id="{ item }">
                <v-img
                :src="getTypeRender(item.type_id)"
                max-height="32"
                max-width="32"
                ></v-img>
              </template>
              <template v-slot:item.owner="{ item }">
                {{ item.corp }}<br />{{ item.alli }}
              </template>
              </v-data-table>
            </v-col>
          </v-row>
        </v-tab-item>
      </v-tabs>
    </div>
  </v-container>
</template>

<script>
import axios from 'axios'
import moment from 'moment'

export default {
  name: 'Home',
  components: {
  },
  data() {
    return {
      searchStructure: '',
      searchTimer: '',
      beUrl: process.env.VUE_APP_BE_URL,
      timerSort: 'expires',
      items: [],
      timerItems: [],
      timerHeaders: [
        {
          text: 'Location ID',
          value: 'location_id'
        },
        {
          text: 'System',
          value: 'system'
        },
        {
          text: 'Region',
          value: 'region'
        },
        {
          text: 'Timer',
          value: 'timer'
        },
        {
          text: 'Type',
          value: 'type_id',
          sortable: false
        },
        {
          text: 'Name',
          value: 'name'
        },
        {
          text: 'Posted',
          value: 'posted'
        },
        {
          text: 'Expires',
          value: 'expires'
        },
        {
          text: 'Expires in',
          value: 'countdown',
          sortable: false
        }
      ],
      headers: [
        {
          text: 'Location ID',
          value: 'location_id',
          groupable: true,
          align: 'start'
        },
        {
          text: 'System',
          value: 'system',
          groupable: false,
          align: 'start'
        },
        {
          text: 'Region',
          value: 'region',
          groupable: false,
          align: 'start'
        },
        {
          text: 'Type',
          value: 'type_id',
          groupable: false,
          sortable: false
        },
        {
          text: 'Name',
          value: 'name',
          groupable: false,
          align: 'start'
        },
        {
          text: 'Owner',
          value: 'owner',
          groupable: false,
          sortable: false
        }/*,
        {
          text: 'Vulnerability Timer',
          value: 'vulnerability',
          groupable: false,
          align: 'start'
        },*/
      ]
    }
  },
  mounted() {
    axios.get(this.beUrl+'/structures',{withCredentials: true})
    .then((response) => {
      this.items = response.data;
    });
    axios.get(this.beUrl+'/timers',{withCredentials: true})
    .then((response) => {
      this.timerItems = response.data;
    })
    setInterval(this.timedUpdate, 1000);
  },
  methods: {
    getTypeRender(id) {
      return 'https://images.evetech.net/types/'+id+'/render?size=64';
    },
    getNow() {
      let date = new Date();
      return date.getUTCFullYear()+'-'+(date.getUTCMonth()+1)+'-'+date.getUTCDate()+' '+date.getUTCHours()+':'+date.getUTCMinutes();
    },
    dateToCountdownStr(date) {
      let duration = moment.duration(moment(date).utc() - moment(), 'milliseconds');
      if (duration > 0) {
        return this.durationToCountdownStr(duration);
      } else {
        return 'ELAPSED';
      }
    },
    durationToCountdownStr(duration) {
      var out = "";
      if (duration.years()) {
          out += duration.years() + 'y ';
      }
      if (duration.months()) {
          out += duration.months() + 'm ';
      }
      if (duration.days()) {
          out += duration.days() + 'd ';
      }
      return out + duration.hours() + "h " + duration.minutes() + "m " + duration.seconds() + "s";
    },
    timedUpdate() {
      let countdowns = document.getElementsByClassName('countdown');
      for (let i = 0; i < countdowns.length; i++) {
        const countdown = countdowns[i];
        countdown.innerHTML = this.dateToCountdownStr(countdown.getAttribute('target'));
      }
    }
  }
}
</script>
