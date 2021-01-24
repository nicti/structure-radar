<template>
  <v-container>
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
    <v-row class="text-center" v-if="this.$parent.$parent.$parent.userId">
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
    <v-row class="text-center" v-if="this.$parent.$parent.$parent.userId">
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
  </v-container>
</template>

<script>
import axios from 'axios'
export default {
  name: 'Home',
  components: {
  },
  data() {
    return {
      searchStructure: '',
      beUrl: process.env.VUE_APP_BE_URL,
      items: [],
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
        },
        {
          text: 'Asset Owners',
          value: 'asset_owner',
          groupable: false,
          align: 'start'
        },
        {
          text: 'Vulnerability Timer',
          value: 'vulnerability',
          groupable: false,
          align: 'start'
        },

      ]
    }
  },
  mounted() {
    axios.get(this.beUrl+'/structures',{withCredentials: true})
    .then((response) => {
      this.items = response.data;
    })
  },
  methods: {
    getTypeRender(id) {
      return 'https://images.evetech.net/types/'+id+'/render?size=64';
    }
  }
}
</script>
