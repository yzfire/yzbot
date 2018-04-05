const Discord = require("discord.js");
const client = new Discord.Client({
    disableEveryone: true
});
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("./config.json", "utf-8"));
const token = config.token;

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag} on command-handled bot.`);
});

client.on("message", msg => {
  if(msg.author.bot) return;
  if(msg.content.indexOf(config.prefix) !== 0) return;

  // This is the best way to define args. Trust me.
  const args = msg.content.slice(config.prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  // The list of if/else is replaced with those simple 2 lines:
  try {
    let commandFile = require(`./commands/${command}.js`);
    commandFile.run(client, msg, args);
  } catch (err) {
    console.error(err);
  }
});

client.login(token);