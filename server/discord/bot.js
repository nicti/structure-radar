const dotenv = require('dotenv').config().parsed;
const { models } = require('../models');
const Discord = require('discord.js')
const client = new Discord.Client()
const axios = require('axios');

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

const tickerCache = {};

async function getTicker(id) {
    if (!tickerCache[id]) {
        let corp = await esi.get('/v4/corporations/'+id+'/');
        corp = corp.data;
        let ticker = '<'+corp.ticker+'>';
        if (corp.alliance_id) {
            let alli = await esi.get('/v4/alliances/'+corp.alliance_id+'/');
            alli = alli.data;
            ticker = ticker + '['+alli.ticker+']';
        }
    tickerCache[id] = ticker;
    }
    return tickerCache[id];
}

async function searchStructures(id, access, refresh, search, owner = false) {
    let structureList = {};
    let structures;
    try {
        structures = await esi.get('/v3/characters/'+id+'/search/?categories=structure&search='+search, {
            headers: {
                Authorization: 'Bearer '+access
            }
        });
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
            structures = await esi.get('/v3/characters/'+id+'/search/?categories=structure&search='+search, {
                headers: {
                    Authorization: 'Bearer '+character.accessToken
                }
            });
        }
    }
    if (typeof structures.data !== "undefined" && typeof structures.data.structure === 'object') {
        structures = structures.data.structure;
    } else {
        return [];
    }
    for (let i = 0; i < structures.length; i++) {
        const structureId = structures[i];
        let structureData
        try {
            structureData = await esi.get('/v2/universe/structures/'+structureId+'/',{
                headers: {
                    Authorization: 'Bearer '+access
                }
            });
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
                structureData = await esi.get('/v2/universe/structures/'+structureId+'/',{
                    headers: {
                        Authorization: 'Bearer '+character.accessToken
                    }
                });
            } else {
                throw error;
            }
        }
        structureData = structureData.data;
        let ticker = '';
        if (owner) {
            ticker = await getTicker(structureData.owner_id);
        }
        structureList[structureId] = structureData.name+' ('+typeMap[structureData.type_id]+')'+ticker;
    }
    return structureList;
}

client.on('message',async (message) => {
    //Request is pointing at this bot
    let characters;
    if (message.content.startsWith('<@!'+client.user.id+'> ')) {
        let fullCommand = message.content.replace('<@!'+client.user.id+'> ','');
        let command = fullCommand.split(' ')[0];
        switch (command) {
            case 'status':
                characters = await models.character.findAndCountAll();
                let structures = await models.structure.findAndCountAll();
                let unanchoring = ''+
                '```Astrahus: 0\nFortizar: 0\nKeepstar: 0```'+
                '```Draccous: 0\nHorizon:  0\nMarginis: 0\nMoreau:   0\nPromethe: 0```'+
                '```Raitaru:  0\nAzbel:    0\nSotiyo:   0```'+
                '```Athanor:  0\nTatara:   0\n```';
                let embed = new Discord.MessageEmbed()
                .setTitle('Status')
                .addFields(
                    {name: 'Characters', value: characters.count, inline: true},
                    {name: 'Tracked structures', value: structures.count, inline: true},
                    {name: 'Unanchoring', value: unanchoring}
                )
                ;
                message.channel.send(embed);
                break;
            case 'setup':
                let mentionRoleCount = message.guild.roles.cache.filter(role => (role.name === dotenv.MENTION_ROLE)).size
                if (mentionRoleCount) {
                    message.channel.send('Setup was already executed!');
                } else {
                    let created = await message.guild.roles.create({
                        data: {
                            name: dotenv.MENTION_ROLE
                        }
                    });
                    message.channel.send('<@&'+created.id+'> created!');
                }
                break;
            case 'search':
                message.channel.startTyping();
                let structureList = {};
                characters = await models.character.findAll();
                let search = fullCommand.split(' ')[1];
                for (let i = 0; i < characters.length; i++) {
                    const character = characters[i];
                    try {
                        let result = await searchStructures(character.id,character.accessToken,character.refreshToken,search,fullCommand.split(' ').includes('--owner'));
                        structureList = {...structureList, ...result};
                    } catch (error) {
                        message.channel.send('Failed to process search for character '+character.name+':```'+error+'```');
                    }
                }
                let renderList = Object.values(structureList).sort();
                if (renderList.length) {
                    message.channel.send('Following structures were found:```'+renderList.join("\n")+'```');
                } else {
                    message.channel.send('No structures found for `'+search+'`');
                }
                message.channel.stopTyping();
                break;
            default:
                break;
        }
    }
})

client.login(dotenv.BOT_TOKEN)