require('dotenv').config()
const yargs = require('yargs');
const Discord = require('discord.js');
const client = new Discord.Client();

var argv = require('yargs/yargs')(process.argv.slice(2)).argv;

const message = argv.message;
if (!message) {
    process.exit();
}

client.on("ready",async () => {
    const channel = client.channels.cache.find(ch => ch.id == process.env.REPORT_CHANNEL);
    await channel.send(message);
    process.exit();
});
client.login(process.env.BOT_TOKEN);