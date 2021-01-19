const dotenv = require('dotenv').config().parsed;
const { models } = require('../models');
const Discord = require('discord.js')
const client = new Discord.Client()


client.on('message',async (message) => {
    //Request is pointing at this bot
    if (message.content.startsWith('<@!'+client.user.id+'> ')) {
        let command = message.content.replace('<@!'+client.user.id+'> ','');
        switch (command) {
            case 'status':
                let characters = await models.character.findAndCountAll();
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
        
            default:
                break;
        }
    }
})

client.login(dotenv.BOT_TOKEN)