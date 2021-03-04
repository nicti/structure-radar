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

function getCountById(structuresByType, id) {
    let i,d;
    i = structuresByType.findIndex((element) => element.type_id === id);
    if (i === -1) {
        return 0;
    }
    d = structuresByType[i];
    structuresByType.splice(i,1);
    if (typeof d === 'undefined') {
        return 0;
    }
    return d.count;
}

function transformDbToOutput(structuresByType) {
    let unknownCount = getCountById(structuresByType, '');
    let astrahusCount = getCountById(structuresByType, '35832');
    let fortizarCount = getCountById(structuresByType, '35833');
    let keepstarCount = getCountById(structuresByType, '35834');
    let raitaruCount = getCountById(structuresByType, '35825');
    let azbelCount = getCountById(structuresByType, '35826');
    let sotiyoCount = getCountById(structuresByType, '35827');
    let athanorCount = getCountById(structuresByType, '35835');
    let tataraCount = getCountById(structuresByType, '35836');
    let ansiblexCount = getCountById(structuresByType, '35841');
    let tenebrexCount = getCountById(structuresByType, '37534');
    let pharoluxCount = getCountById(structuresByType, '35840');
    let draccousCount = getCountById(structuresByType, '47513');
    let horizonCount = getCountById(structuresByType, '47514');
    let marginisCount = getCountById(structuresByType, '47515');
    let prometheusCount = getCountById(structuresByType, '47516');
    let moreauCount = getCountById(structuresByType, '47512');
    let otherCount = 0;
    for (let i = 0; i < structuresByType.length; i++) {
        const element = structuresByType[i];
        otherCount = otherCount + parseInt(element.count);
    }
    let text = ''+
                '```Astrahus: '+astrahusCount+'\nFortizar: '+fortizarCount+'\nKeepstar: '+keepstarCount+'```'+
                '```Draccous: '+draccousCount+'\nHorizon:  '+horizonCount+'\nMarginis: '+marginisCount+'\nMoreau:   '+moreauCount+'\nPromethe: '+prometheusCount+'```'+
                '```Raitaru:  '+raitaruCount+'\nAzbel:    '+azbelCount+'\nSotiyo:   '+sotiyoCount+'```'+
                '```Athanor:  '+athanorCount+'\nTatara:   '+tataraCount+'```'+
                '```Unknown:  '+unknownCount+'\nOthers:   '+otherCount+'```';
    return text;
}

client.on('message',async (message) => {
    //Request is pointing at this bot
    let characters;
    if (message.content.startsWith('<@!'+client.user.id+'> ')) {
        let notifyRole = message.guild.roles.cache.find(role => role.name === dotenv.MENTION_ROLE);
        let fullCommand = message.content.replace('<@!'+client.user.id+'> ','');
        let command = fullCommand.split(' ')[0];
        switch (command) {
            case 'status':
                characters = await models.character.findAndCountAll();
                let structures = await models.structure.findAndCountAll();
                let structuresByType = (await models.structure.findAndCountAll({group: ['type_id']})).count;
                let text = transformDbToOutput(structuresByType);
                let embed = new Discord.MessageEmbed()
                .setTitle('Status')
                .addFields(
                    {name: 'Characters', value: characters.count, inline: true},
                    {name: 'Tracked structures', value: structures.count, inline: true},
                    {name: 'Details', value: text}
                );
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

            case 'notify':
                if (message.member.roles.cache.has(notifyRole.id)) {
                    message.member.roles.remove(notifyRole).catch(console.error);
                    message.channel.send('<@'+message.author.id+'> has been removed from the mention role.');
                } else {
                    message.member.roles.add(notifyRole).catch(console.error);
                    message.channel.send('<@'+message.author.id+'> has been added to the mention role.');
                }
                break;
            case 'help':
            default:
                message.channel.send('```'
                    +'status                  Displays a status report of tracked structures.\n'
                    +'search <str> [--owner ] Searchs for structures. Optionally can display owners tags.\n'
                    +'notify                  Toggle notfication server group.'
                    +'```');
                break;
        }
    }
})

client.login(dotenv.BOT_TOKEN)