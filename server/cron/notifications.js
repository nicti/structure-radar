const dotenv = require('dotenv').config().parsed;
const { models } = require('../models');
const axios = require('axios');
const Discord = require('discord.js');
const client = new Discord.Client()

const esi = axios.create({
    baseURL: 'https://esi.evetech.net',
});

const typeMap = {
    35832: 'Astrahus',
    35833: 'Fortizar',
    35834: 'Keepstar',
    35825: 'Raitaru',
    35826: 'Azbel',
    35827: 'Sotiyo',
    35835: 'Athanor',
    35836: 'Tatara',
    35841: 'Ansiblex Jump Gate',
    37534: 'Tenebrex Cyno Jammer',
    35840: 'Pharolux Cyno Beacon',
    47513: "'Draccous' Fortizar",
    47514: "'Horizon' Fortizar",
    47515: "'Marginis' Fortizar",
    47516: "'Prometheus' Fortizar",
    47512: "'Moreau' Fortizar"
};

async function requestNotifications(id, access, refresh) {
    let notifications;
    try {
        notifications = await esi.get('/v6/characters/'+id+'/notifications/',{
            headers: {
                Authorization: 'Bearer '+access
            }
        })
    } catch (error) {
        // Access token expired, refresh
        if (error.response.status == 403) {
            let refreshRequest = await esi.post('https://login.eveonline.com/v2/oauth/token',
            {
                grant_type: 'refresh_token',
                refresh_token: refresh
            },
            {
                headers: {
                    Authorization: 'Basic '+Buffer.from(dotenv.ESI_CLIENT_ID + ':' + dotenv.ESI_CLIENT_SECRET).toString('base64')
                }
            })
            character = await models.character.findOne({
                where: {
                    id: id
                }
            });
            character = await character.update({
                accessToken: refreshRequest.data.access_token,
                refreshToken: refreshRequest.data.refresh_token
            });
            notifications = await esi.get('/v6/characters/'+id+'/notifications/',{
                headers: {
                    Authorization: 'Bearer '+character.accessToken
                }
            });
        }
    }
    return notifications.data;
}

async function process() {
    const channel = client.channels.cache.find(channel => channel.id == dotenv.REPORT_CHANNEL);
    let characters = await models.character.findAll();
    for (let i = 0; i < characters.length; i++) {
        const character = characters[i];
        let notifications = await requestNotifications(character.id, character.accessToken, character.refreshToken);
        notifications = notifications.filter(notification => (notification.type === 'StructureImpendingAbandonmentAssetsAtRisk' || notification.type === 'StructureUnanchoring'));
        for (let j = 0; j < notifications.length; j++) {
            const notification = notifications[j];
            let timers = await models.timer.findAll({
                where: {
                    notification_id: notification.notification_id
                }
            });
            if (timers.length) {
                continue;
            }
            if (notification.type === 'StructureImpendingAbandonmentAssetsAtRisk') {
                let diff = (/daysUntilAbandon: (.*?)\n/gm).exec(notification.text)[1];
                let solar = (/solarsystemID: (.*?)\n/gm).exec(notification.text)[1];
                let link = (/<a href="showinfo:(.*?)\/\/(.*?)">(.*?)<\/a>/gs).exec(notification.text);
                let type_id = link[1];
                let location_id = link[2];
                let location_name = link[3];
                let date = new Date(notification.timestamp);
                let startTime = date.getUTCFullYear()+'-'+
                            (date.getUTCMonth()+1).toString().padStart(2,'0')+'-'+
                            date.getUTCDate().toString().padStart(2,'0')+' '+
                            date.getUTCHours().toString().padStart(2,'0')+':'+
                            date.getUTCMinutes().toString().padStart(2,'0');
                date.setDate(date.getDate()+parseInt(diff)+1);
                let endTime =   date.getUTCFullYear()+'-'+
                (date.getUTCMonth()+1).toString().padStart(2,'0')+'-'+
                date.getUTCDate().toString().padStart(2,'0')+' '+
                date.getUTCHours().toString().padStart(2,'0')+':'+
                date.getUTCMinutes().toString().padStart(2,'0');
                let system = await esi.get('/v4/universe/systems/'+solar+'/');
                let conste = await esi.get('/v1/universe/constellations/'+system.data.constellation_id+'/');
                let region = await esi.get('/v1/universe/regions/'+conste.data.region_id+'/');
                await models.timer.create({
                    notification_id: notification.notification_id,
                    character_id: character.id,
                    location_id: location_id,
                    location_name: location_name,
                    type_id: type_id,
                    timer: 'Abandoned',
                    system: system.data.name,
                    region: region.data.name,
                    posted_at: startTime,
                    expires_at: endTime
                });
                let embed = new Discord.MessageEmbed()
                .setTitle(location_name)
                .setColor('#aa0000')
                .setFooter('Detected at '+startTime+' EVE Time')
                .setThumbnail('https://images.evetech.net/types/'+type_id+'/render?size=256')
                .addFields(
                    {name: 'Structure', value: typeMap[type_id], inline: true},
                    {name: 'Type', value: 'Abandoned', inline: true},
                    {name: 'Expected timer', value: endTime, inline: false},
                    {name: 'System', value: system.data.name, inline: true },
                    {name: 'Region', value:region.data.name, inline: true }
                );
                await channel.send({content: 'New timer detected by ['+character.name+']:', embed: embed});
            }
        }
    }
    client.destroy();
}
client.on("ready",() => {
    process();
});
client.login(dotenv.BOT_TOKEN);