const dotenv = require('dotenv').config().parsed;
const { models } = require('../models');
const Discord = require('discord.js');
const client = new Discord.Client();

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

async function process() {
    let now = new Date(new Date().toUTCString());
    let timers = await models.timer.findAll({
        where: {
            is_force_expired: false
        }
    });
    let sixtyTimer = timers.filter((val) => {
        let timerTime = new Date(val.expires_at+' UTC');
        let diff = timerTime - now;
        if (diff < (1000*60*60) && diff > 0 && !val.is_notified_60) {
            return true;
        }
        return false;
    });
    let zeroTimer = timers.filter((val) => {
        let timerTime = new Date(val.expires_at);
        let diff = timerTime - now;
        if (diff < (1000*60) && diff > (1000*60) && !val.is_notified_0) {
            return true;
        }
        return false;
    });
    if (sixtyTimer || zeroTimer) {
        client.on('ready', async function() {
            const channels = client.channels.cache.filter(channel => dotenv.REPORT_CHANNEL.split(',').includes(channel.id));
            let reportChannels = [];
            channels.forEach((ch, key) => {
                let obj = {};
                obj['channel'] = ch;
                let notifyRole = ch.guild.roles.cache.find(role => role.name === dotenv.MENTION_ROLE);
                obj['notify'] = notifyRole;
                reportChannels.push(obj);
            });
            for (let i = 0; i < sixtyTimer.length; i++) {
                const element = sixtyTimer[i];
                let date = new Date(element.expires_at+' UTC');
                let startTime = date.getUTCFullYear()+'-'+
                                (date.getUTCMonth()+1).toString().padStart(2,'0')+'-'+
                                date.getUTCDate().toString().padStart(2,'0')+' '+
                                date.getUTCHours().toString().padStart(2,'0')+':'+
                                date.getUTCMinutes().toString().padStart(2,'0');
                embed = new Discord.MessageEmbed()
                    .setTitle(element.location_name)
                    .setColor('#aa0000')
                    .setThumbnail('https://images.evetech.net/types/'+element.type_id+'/render?size=256')
                    .addFields(
                        {name: 'Structure', value: typeMap[element.type_id], inline: true},
                        {name: 'Type', value: element.timer, inline: true},
                        {name: 'Time', value: startTime, inline: false},
                        {name: 'System', value: element.system, inline: true },
                        {name: 'Region', value: element.region, inline: true }
                    );
                for (let z = 0; z < reportChannels.length; z++) {
                    const reportChannel = reportChannels[z];
                    await reportChannel.channel.send({content: '<@&'+reportChannel.notify.id+'>\nThe following timer will elapse in less than **60 minutes**:', embed: embed});
                }
                element.is_notified_60 = true;
                element.save();
            }
            for (let i = 0; i < zeroTimer.length; i++) {
                const element = zeroTimer[i];
                let date = new Date(element.expires_at+' UTC');
                let startTime = date.getUTCFullYear()+'-'+
                                (date.getUTCMonth()+1).toString().padStart(2,'0')+'-'+
                                date.getUTCDate().toString().padStart(2,'0')+' '+
                                date.getUTCHours().toString().padStart(2,'0')+':'+
                                date.getUTCMinutes().toString().padStart(2,'0');
                embed = new Discord.MessageEmbed()
                    .setTitle(element.location_name)
                    .setColor('#aa0000')
                    .setThumbnail('https://images.evetech.net/types/'+element.type_id+'/render?size=256')
                    .addFields(
                        {name: 'Structure', value: typeMap[element.type_id], inline: true},
                        {name: 'Type', value: element.timer, inline: true},
                        {name: 'Time', value: startTime, inline: false},
                        {name: 'System', value: element.system, inline: true },
                        {name: 'Region', value: element.region, inline: true }
                    );
                for (let z = 0; z < reportChannels.length; z++) {
                    const reportChannel = reportChannels[z];
                    await reportChannel.channel.send({content: '<@&'+reportChannel.notify.id+'>\nThe following timer will elapse **now**:', embed: embed});
                }
                element.is_notified_0 = true;
                element.save();
            }
            client.destroy();
        });
        client.login(dotenv.BOT_TOKEN);
    }
    let a = 'b';
}

process();