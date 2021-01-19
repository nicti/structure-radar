const dotenv = require('dotenv').config().parsed;
const { models } = require('../models');
const axios = require('axios');

const esi = axios.create({
    baseURL: 'https://esi.evetech.net',
});

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
    let characters = await models.character.findAll();
    for (let i = 0; i < characters.length; i++) {
        const character = characters[i];
        let notifications = await requestNotifications(character.id, character.accessToken, character.refreshToken);
        notifications = notifications.filter(notification => (notification.type === 'StructureImpendingAbandonmentAssetsAtRisk' || notification.type === 'StructureUnanchoring'));
        for (let j = 0; j < notifications.length; j++) {
            const notification = notifications[j];
            let date = new Date(notification.timestamp);
            let startTime = date.getUTCFullYear()+'-'+
                            (date.getUTCMonth()+1).toString().padStart(2,'0')+'-'+
                            date.getUTCDate().toString().padStart(2,'0')+' '+
                            date.getUTCHours().toString().padStart(2,'0')+':'+
                            date.getUTCMinutes().toString().padStart(2,'0');
            date.setDate(date.getDate()+7);
            let endTime =   date.getUTCFullYear()+'-'+
                            (date.getUTCMonth()+1).toString().padStart(2,'0')+'-'+
                            date.getUTCDate().toString().padStart(2,'0')+' '+
                            date.getUTCHours().toString().padStart(2,'0')+':'+
                            date.getUTCMinutes().toString().padStart(2,'0');
            let textData = {};
            let lines = notification.text.split('\n');
            for (let l = 0; l < lines.length; l++) {
                const line = lines[l];
                let split = line.split(': ');
                textData[split.shift()] = split.join(': ');
            }
            let a = 'b';
        }
    }
}

process();