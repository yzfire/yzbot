// Reminder to change the id in yzbotGM variable to "418827411350618122" on release and token to process.env.TOKEN!
//
// Do not forget this!!!

// Don't change these lines of code. This is to allow the bot to remain hosted on glitch.com 24/7.
const http = require('http');
const express = require('express');
const app = express();
app.get("/", (request, response) => {
  console.log(Date.now() + " Ping Received");
  response.sendStatus(200);
});
app.listen(process.env.PORT);
setInterval(() => {
  http.get(`http://${process.env.PROJECT_DOMAIN}.glitch.me/`);
}, 280000);

const Discord = require("discord.js");
const client = new Discord.Client({disableEveryone: true}); // Creates a new Discord client, disables @ everyone.
const fs = require("fs");
const helpJSON = JSON.parse(fs.readFileSync("./help.json", "utf8"));
const token = "no token for you";
const devId = "267670678050832384";
const Enmap = require("enmap");
const EnmapLevel = require("enmap-level");
const guildSettingsSource = new EnmapLevel({name: "guildSettings"});
client.guildSettings = new Enmap({provider: guildSettingsSource});

const defaultSettings = {
  prefix: ".",
  modlog: "none",
  amtmodlogs: 0
}

const getMemberCount = () => {
  let amount = 0;
  client.guilds.forEach(c=>amount+=c.memberCount);
  return amount;
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}! Currently serving ${getMemberCount()} members in ${client.guilds.size} servers.`);
  client.user.setStatus("dnd");
  client.user.setActivity(`.help | If not working kick the bot when it's online and reinvite it then try again | Currently serving ${getMemberCount()} members in ${client.guilds.size} servers.`);
});

client.on("message", msg => {
  // Define all of our constants at the top of the event listener.
  const yzbotGM = msg.guild.members.get("423205967870820352");
  const authorGM = msg.member;
  const authorUser = msg.author;
  if(authorUser.bot || msg.channel.type !== "text") return; // If the author of the message is a bot, or if the channel the command is being sent in is not a text channel of a Discord server, return
  const guildConfig = client.guildSettings.get(msg.guild.id); // We now have access to that object that we set for when the bot was added in a server
  const prefix = guildConfig.prefix; // With the object, we can access the prefix
  const modlogID = guildConfig.modlog; // and the Moderation Log ID.
  const args = msg.content.slice(prefix.length).trim().split(/ +/g); // Removes prefix, deletes whitespace, splits the command into an array where we have the command and anything that the user delimits with a space.
  const command = args.shift().toLowerCase(); // Remove the command from the args variable and store it here instead, make it lowercase to avoid case-sensitivity issues
  if(!msg.content.startsWith(prefix)) return; // if the message content doesn't start with the prefix don't waste time going through all of this stuff
  if(command === "prefix"){
    let option = args[0];
    let validOptions = ["set"];
    if(!option) return msg.reply(`you must specify an option! List of valid options:\n${validOptions.join(", ")}`)
    if(validOptions.includes(option)){
      if(option == "set"){
        if(authorGM.hasPermission("MANAGE_SERVER") || authorGM.hasPermission("ADMINISTRATOR")/* || authorGM.id === msg.guild.ownerID*/){ // If author guildMember object has admin or manage_server
          let prefixToSet = args.slice(1).join(" ");
          if(!prefixToSet) return msg.reply(`you have not specified a prefix!`);
          if(prefixToSet.length > 20){
            return msg.reply(`your specified prefix is too long! The prefix limit is 20 characters! (${prefixToSet.length} characters were entered.)`)
          }
          guildConfig.prefix = prefixToSet;
          client.guildSettings.set(msg.guild.id, guildConfig);
          return msg.reply(`prefix set as **${prefixToSet}** successfully!  | :white_check_mark:`);
        }else{
          return msg.reply("you must have the ``MANAGE_SERVER`` or ``ADMINISTRATOR`` permission to use this command!");
        }
      }
    }else{
      return msg.reply(`an invalid option was used! List of valid options:\n${validOptions.join(", ")}`);
    }
  }else if(command === "lenny"){
    return msg.channel.send("( ͡° ͜ʖ ͡°)");
  }else if(command === "narbrating"){
    if(authorUser.id == devId){ // if the person who executed it is me,
			return msg.reply("your narb rating is 0 out of 100, and it always will be, because you're yzfire, damnit!");
			console.log(`.narbrating was executed by ${u.username}`)
		}else if(authorUser.id == "335591511045439490"){ // else if it's Tahs0,
			return msg.reply("your narb rating is 100 out of 100. It always will be, you cancerous narb.");
			console.log(`.narbrating was executed by ${u.username}`)
		}else{ // else if it's someone else
			let rating = Math.ceil(Math.random() * 100);
			return msg.reply(`your narb rating is ${rating} out of 100.`);
			console.log(`.narbrating was executed by ${u.username}`)
    }
  }else if(command === "shutdown"){ // In production bot replace all instances of shutdown with restart
    if(authorUser.id !== devId) return msg.reply("you cannot use this command.");
    msg.reply("shutting down in 3 seconds...");
    setTimeout(process.exit, 3000); // Shut down the bot after 3 seconds.
  }else if(command === "avatar"){
    let memb = msg.mentions.members.first();
    if(yzbotGM.hasPermission("EMBED_LINKS") || yzbotGM.hasPermission("ADMINISTRATOR")){
      if(memb){ // If a member was mentioned.
        const embed = new Discord.RichEmbed()
          .setTitle(`Avatar of ${memb.user.tag}`)
          .setImage(`${memb.user.displayAvatarURL}`)
          .setFooter(`ID: ${memb.id}`)
          .setTimestamp()
          return msg.channel.send({embed});
      }else{ // A member was not mentioned.
        const embed = new Discord.RichEmbed()
          .setTitle(`Avatar of ${authorUser.tag}`)
          .setImage(`${authorUser.displayAvatarURL}`)
          .setFooter(`ID: ${authorUser.id}`)
          .setTimestamp()
          return msg.channel.send({embed});
      }
    }else{ // yzbot can't embed links
      if(memb){ // Text fallback. If a member was mentioned.
        return msg.channel.send(`__**Avatar URL of ${memb.user.tag}:**__\n\n${memb.user.displayAvatarURL}\n\nThis is a text-based fallback and is not recommended. If you are a server administrator: To get an embedded avatar please enable the \`\`EMBED_LINKS\`\` permission for yzbot.\nUser ID:${memb.id}`);
      }else{  // Text fallback. If a member was not mentioned.
        return msg.channel.send(`__**Avatar URL of ${authorUser.tag}\n\n${authorUser.displayAvatarURL}\nnThis is a text-based fallback and is not recommended. If you are a server administrator: To get an embedded avatar please enable the \`\`EMBED_LINKS\`\` permission for yzbot.\nUser ID:${authorUser.id}`);
      }
    }
  }else if(command === "modlog"){
    let option = args[0];
    let validOptions = ["set", "remove"];
    if(validOptions.includes(option)){ // If the option set is in the list of valid options, do the below
      if(authorGM.hasPermission("BAN_MEMBERS") || authorGM.hasPermission("KICK_MEMBERS") || authorGM.hasPermission("MANAGE_SERVER") || authorGM.hasPermission("ADMINISTRATOR") || authorGM.id === msg.guild.ownerID){
        if(option == "set"){
          let log = msg.mentions.channels.first(); // we want the first channel.
          if(!log) return msg.reply("you must specify a log channel!");
          if(!log.type === "text") return msg.reply("you may only set your mod log as a text channel!");
          guildConfig.modlog = log.id; // We're setting the guild config's mod log variable as the ID of the channel that was received.
          client.guildSettings.set(msg.guild.id, guildConfig); // Just changing it above isn't enough. To change it in database you need to set the object again, under the guild ID you wish.
          return msg.reply(`mod log set as <#${guildConfig.modlog}> successfully!`);
        }else if(option == "remove"){
          if(guildConfig.modlog == "none") return msg.reply("your mod log has not been set!");
          guildConfig.modlog = "none";
          client.guildSettings.set(msg.guild.id, guildConfig);
          return msg.reply("mod log was removed successfully!");
        }
      }else{
        return msg.reply("you must have at least one of the four below permissions to be able to set or remove the mod log channel:\n\n``BAN_MEMBERS``\n``KICK_MEMBERS``\n``MANAGE_SERVER``\n``ADMINISTRATOR``");
      }
  }else{
    return msg.reply(`please specify a valid option! The list of valid options is below:\n\n${validOptions.join(", ")}`);
  }
  }else if(command === "ban"){
    if(yzbotGM.hasPermission("BAN_MEMBERS") || yzbotGM.hasPermission("ADMINISTRATOR")){
      if(authorGM.hasPermission("BAN_MEMBERS") || authorGM.hasPermission("ADMINISTRATOR") || authorGM.id === msg.guild.ownerID){
        let reason = args.slice(1).join(" ");
        let member = msg.mentions.members.first();
        if(!member) return msg.reply("please mention a valid member of this server!");
        if(member.id === msg.guild.ownerID) return msg.reply("I cannot ban this user, they are the server owner!");
        if(member.id === msg.author.id) return msg.reply("you can't ban yourself!");
        let membHighRole = member.highestRole.position;
        let authorHighestRole = authorGM.highestRole.position;
        if(!reason) reason = "None specified.";
        if(!member.bannable) return msg.reply("I cannot ban this user!");
        if(membHighRole >= authorHighestRole && !authorGM.id === msg.guild.ownerID) return msg.reply("the specified user has a higher or equal role than you!");
        member.ban(`${reason} | Banned by ${authorUser.tag} using yzbot.`).catch(console.error);
        msg.reply(`user <@${member.id}> was banned successfully! | :white_check_mark:`);
        if(guildConfig.modlog !== "none" && yzbotGM.hasPermission("EMBED_LINKS") || yzbotGM.hasPermission("ADMINISTRATOR")){ // If there is a set mod log.
          guildConfig.amtmodlogs += 1;
          client.guildSettings.set(msg.guild.id, guildConfig);
          let amountmodlogs = guildConfig.amtmodlogs;
          const embed = new Discord.RichEmbed()
            .setTitle(`Moderation Log #${amountmodlogs}`)
            .addField("Action:", "Ban")
            .addField("Moderator", `<@${msg.author.id}>`)
            .addField("User Punished", `<@${member.id}>`)
            .addField("Reason", `${reason}`)
            .setTimestamp()
            client.channels.get(guildConfig.modlog).send({embed});
        }else{
          if(!yzbotGM.hasPermission("EMBED_LINKS") && !yzbotGM.hasPermission("ADMINISTRATOR")) return msg.reply("you must give yzbot the ``EMBED_LINKS`` permission in order for it to be able to set mod logs.");
          return msg.reply(`the member was banned, but no log was set! Please set a log channel by using ${prefix}setmodlog <channel>.`);
        }
      }else{
        return msg.reply("you do not have the ``BAN_MEMBERS`` or ``ADMINISTRATOR`` permission!");
      }
    }else{
      return msg.reply("I do not have the ``BAN_MEMBERS`` or ``ADMINISTRATOR`` permission!");
    }
  }
});

client.on("guildCreate", guild => {
  const embed = new Discord.RichEmbed()
    .setTitle("Added to a server")
    .addField("Server Name:", `${guild.name}`)
    .addField("Server ID", `${guild.id}`)
    .addField("Owner ID:", `${guild.ownerID}`)
    .addField("Members:", `${guild.memberCount}`)
    .addField("Channels:", `${guild.channels.size}`)
    .setTimestamp()
    let logGuild = client.guilds.get("425030567457980417");
    logGuild.channels.get("425031283110969345").send({embed});
  client.user.setActivity(`.help | If not working kick the bot when it's online and reinvite it then try again | Currently serving ${getMemberCount()} members in ${client.guilds.size} servers.`); // Refresh playing-status
  if(!client.guildSettings.get(guild.id)){
    client.guildSettings.set(guild.id, defaultSettings);
  }else{
    return console.log("added to a server which already has a database configuration.");
  }
});

client.on("guildDelete", guild => {
  const embed = new Discord.RichEmbed()
    .setTitle("Removed from a server")
    .addField("Server Name:", `${guild.name}`)
    .addField("Server ID", `${guild.id}`)
    .addField("Owner ID:", `${guild.ownerID}`)
    .addField("Members:", `${guild.memberCount}`)
    .addField("Channels:", `${guild.channels.size}`)
    .setTimestamp()
    let logGuild = client.guilds.get("425030567457980417");
    logGuild.channels.get("425031283110969345").send({embed});
    client.user.setActivity(`.help | If not working kick the bot when it's online and reinvite it then try again | Currently serving ${getMemberCount()} members in ${client.guilds.size} servers.`); // Refresh playing-status
});

client.login(token);
