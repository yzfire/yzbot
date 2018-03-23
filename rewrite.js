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
const token = "No Token For You";
const devId = "267670678050832384";
const Enmap = require("enmap");
const EnmapLevel = require("enmap-level");
const dateFormat = require("dateformat");
const guildSettingsSource = new EnmapLevel({name: "guildSettings"});
client.guildSettings = new Enmap({provider: guildSettingsSource});

const defaultSettings = {
  prefix: ".",
  modlog: "none",
  amtmodlogs: 0,
  //disabledCommands: [];
}

const getMemberCount = () => {
  let amount = 0;
  client.guilds.forEach(c=>amount+=c.memberCount);
  return amount;
}

function clean(text) {
  if (typeof(text) === "string")
    return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
  else
      return text;
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}! Currently serving ${getMemberCount()} members in ${client.guilds.size} servers.`);
  client.user.setStatus("dnd");
  client.user.setActivity(`.help | If not working kick the bot when it's online and reinvite it then try again | Currently serving ${getMemberCount()} members in ${client.guilds.size} servers.`);
});

let talkedRecently = new Set(); // enables us to cooldown

client.on("message", msg => {
  // Define all of our constants at the top of the event listener.
  if(msg.author.bot || msg.channel.type !== "text") return; // If the author of the message is a bot, or if the channel the command is being sent in is not a text channel of a Discord server, return
  const yzbotGM = msg.guild.members.get("423205967870820352");
  const authorGM = msg.member;
  const authorUser = msg.author;
  const guildConfig = client.guildSettings.get(msg.guild.id); // We now have access to that object that we set for when the bot was added in a server
  const prefix = guildConfig.prefix; // With the object, we can access the prefix
  const modlogID = guildConfig.modlog; // and the Moderation Log ID.
  const args = msg.content.slice(prefix.length).trim().split(/ +/g); // Removes prefix, deletes whitespace, splits the command into an array where we have the command and anything that the user delimits with a space.
  const command = args.shift().toLowerCase(); // Remove the command from the args variable and store it here instead, make it lowercase to avoid case-sensitivity issues
  const guildDisabledCommands = guildConfig.disabledCommands;
  let timeNow = new Date();
  if(!msg.content.startsWith(prefix)) return; // if the message content doesn't start with the prefix don't waste time going through all of this stuff
  // Cooldown functionality.
  if(talkedRecently.has(msg.author.id)) return;
  talkedRecently.add(msg.author.id);
  setTimeout(() => {
    talkedRecently.delete(msg.author.id);
  }, 2000);
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
        return msg.channel.send(`__**Avatar URL of ${memb.user.tag}:**__\n\n${memb.user.displayAvatarURL}\n\nThis is a text-based fallback and is not recommended. If you are a server administrator: To get an embedded avatar please enable the \`\`EMBED_LINKS\`\` permission for yzbot.\nUser ID: ${memb.id}`);
      }else{  // Text fallback. If a member was not mentioned.
        return msg.channel.send(`__**Avatar URL of ${authorUser.tag}:**__\n\n${authorUser.displayAvatarURL}\n\nThis is a text-based fallback and is not recommended. If you are a server administrator: To get an embedded avatar please enable the \`\`EMBED_LINKS\`\` permission for yzbot.\nUser ID: ${authorUser.id}`);
      }
    }
  }else if(command === "modlog"){
    let option = args[0];
    let validOptions = ["set", "remove"];
    if(validOptions.includes(option)){ // If the option set is in the list of valid options, do the below
      if(authorGM.hasPermission("MANAGE_CHANNELS") || authorGM.hasPermission("MANAGE_SERVER") || authorGM.hasPermission("ADMINISTRATOR") || authorGM.id === msg.guild.ownerID){
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
        return msg.reply("you must have at least one of the four below permissions to be able to set or remove the mod log channel:\n\n``MANAGE_CHANNELS``\n``MANAGE_SERVER``\n``ADMINISTRATOR``");
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
        if(member.id === msg.guild.ownerID) return msg.reply("I cannot ban this user, they are the server owner!"); // Checks if the author's UID is equal to the server owner's, if so they own the server and can thus not be banned
        if(member.id === msg.author.id) return msg.reply("you can't ban yourself!");
        let membHighRole = member.highestRole.position;
        let authorHighestRole = authorGM.highestRole.position;
        if(!reason) reason = "None specified.";
        if(!member.bannable) return msg.reply("I cannot ban this user!");
        if(membHighRole >= authorHighestRole && !authorGM.id === msg.guild.ownerID) return msg.reply("the specified user has a higher or equal role than you!");
        member.ban(`${reason} | Banned by ${authorUser.tag} using yzbot.`).catch(console.error);
        msg.reply(`user <@${member.id}> was banned successfully! | :white_check_mark:`);
        if(modlogID == "none") return msg.reply(`the member was banned, but no mod log was set, as you have not set a mod log channel! Set one by using ${prefix}modlog set <channel>.`);
        if(modlogID !== "none" && !yzbotGM.hasPermission("EMBED_LINKS") && !yzbotGM.hasPermission("ADMINISTRATOR")) return msg.reply(`you have a mod log channel, but yzbot does not have the appropriate permissions to post the mod log!`);
        guildConfig.amtmodlogs += 1;
        client.guildSettings.set(msg.guild.id, guildConfig);
        let amountmodlogs = guildConfig.amtmodlogs;
        const embed = new Discord.RichEmbed()
          .setTitle(`Moderation Log #${amountmodlogs}`)
          .addField("Action:", "Ban")
          .addField("Moderator", `<@${msg.author.id}>`)
          .addField("User Punished", `<@${membId}>`)
          .addField("Reason", `${reason}`)
          .setTimestamp()
          client.channels.get(modlogID).send({embed});
      }else{
        return msg.reply("you do not have the ``BAN_MEMBERS`` permission!")
      }
    }else{
      return msg.reply("I do not have the ``BAN_MEMBERS`` permission!");
    }
  }else if(command === "clear"){
    if(yzbotGM.hasPermission("MANAGE_MESSAGES") || yzbotGM.hasPermission("ADMINISTRATOR")){
      if(authorGM.hasPermission("MANAGE_MESSAGES") || authorGM.hasPermission("ADMINISTRATOR") || authorGM.id === msg.guild.ownerID){
        let amount = args[0]; // The first argument is the expected amount of messages to delete.
        if(!amount) return msg.reply("please provide a valid number of messages to delete!");
        //if(amount.length > 2) return msg.reply("you may only enter two characters as the amount of messages to delete, a number between 1 and 99!");
        if(isNaN(amount)) return msg.reply("the entered value is not a number!"); // Is the amount specified, not a number? Test with isNaN()!
        let amountInteger = parseInt(amount); // Parse it as an integer so we can add one to it.
        if(amountInteger < 1 || amountInteger > 99) return msg.reply("please provide a number between 1 and 99!");
        msg.channel.fetchMessages({ limit: amountInteger+1 }).then(m=>msg.channel.bulkDelete(m)); // Fetch the number of messages specified, then delete that amount of messages from the channel.
        const rep = msg.reply(`cleared **${amount} messages** successfully!`) // Tell the user that they successfully deleted the wanted messages.
        .then((themsg) => {
          const del = () => themsg.delete(); // function to delete the message
          setTimeout(del, 3000); // delete in 3 seconds
        });
      }else{
        return msg.reply("you do not have the ``MANAGE_MESSAGES`` permission!");
      }
    }else{
      return msg.reply("I do not have the ``MANAGE_MESSAGES`` permission!");
    }
  }else if(command === "info"){
    let specifiedCategory = args[0];
    let acceptableCategories = ["user", "server", "role", "bot"]; //Acceptable categories for info command.
    if(!acceptableCategories.includes(specifiedCategory)) return msg.reply(`please specify a valid category! The valid categories are listed below:\n\n${acceptableCategories.join(", ")}`);
    if(specifiedCategory === "user"){ // ${prefix}info user
      let memb = msg.mentions.members.first() || authorGM; // The member object is either the author as a guildMember object or the first member retrieved from the valid MessageMentions.
      let highestRole = memb.highestRole.name;
      let userStatus = memb.presence.status;
      switch(userStatus){
        case "online":
          userStatus = "Online";
          break;
        case "offline":
          userStatus = "Offline/Invisible";
          break;
        case "idle":
          userStatus = "Idle";
          break;
        case "dnd":
          userStatus = "Do not Disturb";
          break;
      }
      if(highestRole === "@everyone") highestRole = "@ everyone";
      if(yzbotGM.hasPermission("EMBED_LINKS") || yzbotGM.hasPermission("ADMINISTRATOR")){
        const embed = new Discord.RichEmbed()
          .setColor(`${memb.displayHexColor}`)
          .setThumbnail(`${memb.user.displayAvatarURL}`)
          .setTitle(`User info of ${memb.user.tag}:`)
          .addField("ID", `${memb.id}`)
          .addField("Account Created", `${memb.user.createdAt}`)
          .addField("Avatar URL", `${memb.user.displayAvatarURL}`)
          .addField("Highest Role", `${highestRole}`)
          .addField("Status", `${userStatus}`)
          .setFooter(`User info requested by ${authorUser.tag}`)
          .setTimestamp()
          msg.channel.send({embed});
      }else{ // can't send embeds
        let timeFormatted = dateFormat(timeNow, "dS mmm, yyyy - h:MM TT"); // Use date format module for easy formatting of dates
        msg.channel.send(`:warning: **I do not have \`\`EMBED_LINKS\`\` permissions, if you want a better version of this please enable it for yzbot.** :warning:\n\n__**User info of ${memb.user.tag}:**__\n\n\n**ID:** ${memb.id}\n\n**Account Created:** ${memb.user.createdAt}\n\n**Avatar URL:** ${memb.user.displayAvatarURL}\n\n**Highest Role:** ${highestRole}\n\n**Status:** ${userStatus}\n\n\n__User info requested by ${authorUser.tag} | ${timeFormatted}__`);
      }
    }else if(specifiedCategory === "server"){
      let highestPosition = msg.guild.roles.size - 1;
      let highRole = msg.guild.roles.find("position",highestPosition);
      if(highRole === "@everyone") highRole = "@ everyone";
      let verification_level;
  		switch(msg.guild.verificationLevel){
  			case 0:
  				verification_level = "None";
  				break;
  			case 1:
  				verification_level = "Low";
  				break;
  			case 2:
  				verification_level = "Medium";
  				break;
  			case 3:
  				verification_level = "High";
  				break;
  			case 4:
  				verification_level = "Very High";
  				break;
  		}
    if(yzbotGM.hasPermission("EMBED_LINKS") || yzbotGM.hasPermission("ADMINISTRATOR")){
      const embed = new Discord.RichEmbed()
        .setTitle(`Information about the server ${msg.guild.name}`)
        .addField(`Members`, `${msg.guild.memberCount}`)
        .addField(`Owner`, `${msg.guild.owner.user.tag} (${msg.guild.owner})`)
        .addField(`Region`, `${msg.guild.region}`)
        .addField(`Number of roles`, `${msg.guild.roles.size}`)
        .addField(`Highest Role`, `${highRole.name}`)
        .addField(`Server Created`, `${msg.guild.createdAt}`)
        .addField(`Verification Level`, `${verification_level}`)
        .setFooter(`Server ID: ${msg.guild.id}`)
        .setTimestamp()
        msg.channel.send({embed});
    }else{ // it can't send embeds
    let timeFormatted = dateFormat(timeNow, "dS mmm, yyyy - h:MM TT"); // Use date format module for easy formatting of dates
    msg.channel.send(`:warning: **I do not have \`\`EMBED_LINKS\`\` permissions, if you want a better version of this please enable it for yzbot.** :warning:
      \n\n__**Information about the server ${msg.guild.name}:**__
      \n\n\n**Members**: ${msg.guild.memberCount}
      \n\n**Owner**: ${msg.guild.owner.user.tag} (ID: ${msg.guild.ownerID})
      \n\n**Region**: ${msg.guild.region}
      \n\n**Number of roles**: ${msg.guild.roles.size}
      \n\n**Highest Role**: ${highRole.name}
      \n\n**Server Created**: ${msg.guild.createdAt}
      \n\n**Verification Level**: ${verification_level}
      \n\n\n__Server ID: ${msg.guild.id} | ${timeFormatted}__`);
    }
  }else if(specifiedCategory === "role"){
    //let wantedRole = args.slice(1).join(" ").toLowerCase(); // The word role is actually args[0] so we have to slice from 1 and join them all up (e.g. ["role", "Bot", "Developer"]) - in that case we'd want to join bot and developer together with a space. Make it lowercase to avoid case-sensitivity issues.
    // let serverRoles = msg.guild.roles.array().map(role => role.name.toLowerCase()); // Creates a new array with all of the roles in the server, in lowercase
    // if(!serverRoles.includes(wantedRole)) return msg.reply("that role is not in this server!");
    let wantedRole = args.slice(1).join(" "); // The word role is actually args[0] so we have to slice from 1 and join them all up (e.g. ["role", "Bot", "Developer"]) - in that case we'd want to join bot and developer together with a space.
    if(!wantedRole) return msg.reply("please provide a role!");
    if(!msg.guild.roles.find("name", wantedRole)) return msg.reply("that role is not in this server, or you have typed the role name incorrectly (case-sensitive)!");
    let roleObj = msg.guild.roles.find("name", wantedRole);
    let onsidebar;
    let isrolementionable;
    if(roleObj.hoist == "true"){
       onsidebar = "Yes";
    }
    else{
      onsidebar = "No";
    }

    if(roleObj.mentionable){
      isrolementionable = "Yes";
    }else{
      isrolementionable = "No";
    }

    const getRoleMembers = () => {
      if(roleObj.members.size < 30){
        let membArr = roleObj.members.array().map(m=>m.id);
        let mentionArr = membArr.map(memb=>`<@${memb}>`)
        let finalMentions = mentionArr.join(", ");
        return finalMentions;
      }else{
        return roleObj.members.size;
      }
    }

    if(yzbotGM.hasPermission("EMBED_LINKS") || yzbotGM.hasPermission("ADMINISTRATOR")){
      const embed = new Discord.RichEmbed()
        .setTitle(`${wantedRole}`)
        .setColor(`${roleObj.hexColor}`)
        .addField("Permission Number (Use converter to see)", `${roleObj.permissions}`)
        .addField("Position (if number is lower, role is lower)", `${parseInt(roleObj.position)+1}`)
        .addField("Role Created", `${roleObj.createdAt}`)
        .addField("Colour", `${roleObj.hexColor}`)
        .addField("On Sidebar", `${onsidebar}`)
        .addField("Mentionable", `${isrolementionable}`)
        .addField("Members", `${getRoleMembers()} (${roleObj.members.size})`)
        .addField("ID:", `${roleObj.id}`)
        .setTimestamp()
        msg.channel.send({embed});
    }else{ // Can't send embeds!
      let timeFormatted = dateFormat(timeNow, "dS mmm, yyyy - h:MM TT");
      msg.channel.send(`:warning: **I do not have \`\`EMBED_LINKS\`\` permissions, if you want a better version of this please enable it for yzbot.** :warning:
        \n\n\n__**${wantedRole}:**__
        \n\n**Permission Number (Use converter to see)**: ${roleObj.permissions}
        \n\n**Position (if number is lower, role is lower**): ${parseInt(roleObj.position)+1}
        \n\n**Role Created**: ${roleObj.createdAt}
        \n\n**Colour**: ${roleObj.hexColor}
        \n\n**On Sidebar**: ${onsidebar}
        \n\n**Mentionable**: ${isrolementionable}
        \n\n**Members**: ${roleObj.members.size}
        \n\n**ID**: ${roleObj.id}
        \n\n\n__${timeFormatted}__
        `);
    }
  }else if(specifiedCategory === "bot"){
      let status = client.user.presence.status;
  		switch(status){
  			case "online":
  				status = "Online";
  				break;
  			case "offline":
  				status = "Offline/Invisible";
  				break;
  			case "idle":
  				status = "Idle";
  				break;
  			case "dnd":
  				status = "Do Not Disturb";
  				break;
  		}
    if(yzbotGM.hasPermission("EMBED_LINKS") || yzbotGM.hasPermission("ADMINISTRATOR")){
  		const embed = new Discord.RichEmbed()
  			.setTitle("Information about yzbot")
  			.setThumbnail(`${client.user.displayAvatarURL}`)
  			.setDescription("yzbot is an open-source Discord bot made by yzfire#6822. This bot is in heavy development. If you need any extra info about the bot, please contact yzfire#6822. Thank you.")
  			.addField("Developer:", `yzfire#6822 (<@${devId}>)`)
        .addField("Version:", "1.1")
  			.addField("Online Since:", `${client.readyAt}`)
  			.addField("ID:", `${client.user.id}`)
  			.addField("Status:", `${status}`)
  			.addField("Servers:", `${client.guilds.size}`)
  			.addField("Channels:", `${client.channels.size}`)
        .addField("Members:", `${getMemberCount()}`)
  			.addField("Created:", `${client.user.createdAt}`)
  			.addField("GitHub:", "https://github.com/yzfire/yzbot")
  			.setFooter(`yzbot information (requested by ${authorUser.tag})`)
  			.setTimestamp()
  			msg.channel.send({embed})
    }else{ // Can't embed.
    let timeFormatted = dateFormat(timeNow, "dS mmm, yyyy - h:MM TT");
    msg.channel.send(`:warning: **I do not have \`\`EMBED_LINKS\`\` permissions, if you want a better version of this please enable it for yzbot.** :warning:
      \n\n\n__**Information about yzbot:**__
      \n\nyzbot is an open-source Discord bot made by yzfire#6822. This bot is in heavy development. If you need any extra info about the bot, please contact yzfire#6822. Thank you.
      \n\n**Version**: 1.1
      \n\n**Online Since**: ${client.readyAt}
      \n\n**ID**: ${client.user.id}
      \n\n**Status**: ${status}
      \n\n**Servers**: ${client.guilds.size}
      \n\n**Channels**: ${client.channels.size}
      \n\n**Members**: ${getMemberCount()}
      \n\n**Created**: ${client.user.createdAt}
      \n\n**GitHub**: https://github.com/yzfire/yzbot
      \n\n\n__yzbot information (requested by ${authorUser.tag}) | ${timeFormatted}__
      `);
    }
  }
  }else if(command === "hackban"){
    if(yzbotGM.hasPermission("BAN_MEMBERS") || yzbotGM.hasPermission("ADMINISTRATOR")){ // Can yzbot ban?
      if(authorGM.hasPermission("BAN_MEMBERS") || authorGM.hasPermission("ADMINISTRATOR") || authorGM.id === msg.guild.ownerID){ // Can author ban members?
        let membId = args[0];
        if(!membId) return msg.reply("please provide an ID!"); // Did they supply an ID at all?
        if(isNaN(membId) || membId.length !== 18) return msg.reply("please provide a valid user ID!"); // Is the supplied ID a number? Does it have a length of 18 characters exactly?
        if(membId === authorUser.id) return msg.reply("you cannot (hack/ID)ban yourself!");
        if(msg.guild.members.get(membId)) return msg.reply(`this member is already in the server - use ${prefix}ban!`);
        let reason = args.slice(1).join(" "); // The rest of their argument.
        if(!reason) reason = "None specified."; // Give reason a value so we avoid getting some sort of error.
        msg.guild.ban(membId, `${reason} | Hackbanned by ${authorUser.tag} using yzbot.`).catch(console.error);
        msg.reply(`user with ID ${membId} (<@${membId}>) banned successfully! | :white_check_mark:`);
        if(modlogID == "none") return msg.reply(`the member was banned, but no mod log was set, as you have not set a mod log channel! Set one by using ${prefix}modlog set <channel>.`);
        if(modlogID !== "none" && !yzbotGM.hasPermission("EMBED_LINKS") && !yzbotGM.hasPermission("ADMINISTRATOR")) return msg.reply(`you have a mod log channel, but yzbot does not have the appropriate permissions to post the mod log!`);
        guildConfig.amtmodlogs += 1;
        client.guildSettings.set(msg.guild.id, guildConfig);
        let amountmodlogs = guildConfig.amtmodlogs;
        const embed = new Discord.RichEmbed()
          .setTitle(`Moderation Log #${amountmodlogs}`)
          .addField("Action:", "Hackban (ID Banned)")
          .addField("Moderator", `<@${msg.author.id}>`)
          .addField("User Punished", `<@${membId}> (ID: ${membId})`)
          .addField("Reason", `${reason}`)
          .setTimestamp()
          client.channels.get(modlogID).send({embed}).catch(console.error);
      }else{
        return msg.reply("you do not have the ``BAN_MEMBERS`` permission!")
      }
    }else{
      return msg.reply("I do not have the ``BAN_MEMBERS`` permission!");
    }
  }else if(command === "github"){
    msg.reply("**yzbot's GitHub page can be found here**: https://github.com/yzfire/yzbot");
  }else if(command === "ping"){
    const m = msg.channel.send("Calculating ping, please wait!").then((pingMsg) => {
      let responseTime = pingMsg.createdTimestamp - msg.createdTimestamp;
      pingMsg.edit(`Pong! Current ping: **${responseTime}ms**`).catch(console.error);
    }).catch(console.error);
  }else if(command === "say"){
    if(authorUser.id !== devId) return;
    let message = args.join(" ").toString();
    msg.channel.send(message).catch(console.error);
    msg.delete();
  }else if(command === "uptime"){
    msg.reply(`I have been online for ${Math.floor(process.uptime())} seconds.`);
  }else if(command === "eval"){
    if(u.id !== devId) return;
    console.log(`.eval was executed by ${u.username}`);
		try {
      const code = args.join(" ");
      let evaled = eval(code);
      if (typeof evaled !== "string")
        evaled = require("util").inspect(evaled);
      msg.channel.send(clean(evaled), {code:"xl"});
    } catch (err) {
      msg.channel.send(`\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``);
    }
  }else if(command === "addrole"){ // Syntax (prefix)addrole (mention) (role), e.g .addrole @yzfire Bot Developer
    if(yzbotGM.hasPermission("MANAGE_ROLES") || yzbotGM.hasPermission("ADMINISTRATOR")){
      if(authorGM.hasPermission("MANAGE_ROLES") || authorGM.hasPermission("ADMINISTRATOR") || authorGM.id === msg.guild.ownerID){
        let roleToAdd = args.slice(1).join(" "); // e.g. ["yzfire", "Bot", "Developer"]
        let memb = msg.mentions.members.first(); // in the above array, this'd be yzfire
        if(!memb) return msg.reply("please provide a member to add the role to!"); // Was a member mentioned?
        if(!roleToAdd) return msg.reply("please provide a role to add!"); // Was a role provided?
        if(!msg.guild.roles.find("name", roleToAdd)) return msg.reply("that role is not in this server, or you have typed the role name incorrectly (case-sensitive)!"); // is the said role in the server?
        let roleObj = msg.guild.roles.find("name", roleToAdd);
        let authorHighestRole = authorGM.highestRole.position;
        let yzbotHighRole = yzbotGM.highestRole.position;
        let rolePos = roleObj.position;

        // Is the position of the role higher than yzbot or the message author? Is the author the server owner?
        // if role pos is higher than author's highest role and yzbots and the author isn't server owner
        // works because if the server owner runs the command, it skips the member checks but still checks if role is higher than yzbot
        // it only gives an error if role is higher than yzbot.

        if(rolePos >= authorHighestRole && rolePos >= yzbotHighRole && authorUser.id !== msg.guild.ownerID) return msg.reply("that role is higher than or equal to in position compared to both of our highest roles!");
        if(rolePos >= authorHighestRole && authorUser.id !== msg.guild.ownerID) return msg.reply("that role is higher than or equal to in position compared to your highest role!");
        if(rolePos >= yzbotHighRole) return msg.reply("that role is higher than or equal to in position compared to my highest role!");
        memb.addRole(roleObj, `addrole command executed by ${authorUser.tag}`).catch(console.error);
        msg.reply(`the role **${roleToAdd}** was added to <@${memb.id}> successfully! | :white_check_mark:`);
      }else{
        return msg.reply("you do not have the ``MANAGE_ROLES`` permission!");
      }
    }else{
      return msg.reply("I do not have the ``MANAGE_ROLES`` permission!");
    }
  }else if(command === "removerole"){
    if(yzbotGM.hasPermission("MANAGE_ROLES") || yzbotGM.hasPermission("ADMINISTRATOR")){
      if(authorGM.hasPermission("MANAGE_ROLES") || authorGM.hasPermission("ADMINISTRATOR") || authorGM.id === msg.guild.ownerID){
        let roleToRemove = args.slice(1).join(" "); // e.g. ["yzfire", "Bot", "Developer"]
        let memb = msg.mentions.members.first(); // in the above array, this'd be yzfire
        if(!memb) return msg.reply("please provide a member to remove the role from!"); // Was a member mentioned?
        if(!roleToRemove) return msg.reply("please provide a role to remove!"); // Was a role provided?
        if(!msg.guild.roles.find("name", roleToRemove)) return msg.reply("that role is not in this server, or you have typed the role name incorrectly (case-sensitive)!"); // is the said role in the server?
        let roleObj = msg.guild.roles.find("name", roleToRemove);
        let authorHighestRole = authorGM.highestRole.position;
        let yzbotHighRole = yzbotGM.highestRole.position;
        let rolePos = roleObj.position;

        // Is the position of the role higher than yzbot or the message author? Is the author the server owner?
        // if role pos is higher than author's highest role and yzbots and the author isn't server owner
        // works because if the server owner runs the command, it skips the member checks but still checks if role is higher than yzbot
        // it only gives an error if role is higher than yzbot.

        if(rolePos >= authorHighestRole && rolePos >= yzbotHighRole && authorUser.id !== msg.guild.ownerID) return msg.reply("that role is higher than or equal to in position compared to both of our highest roles!");
        if(rolePos >= authorHighestRole && authorUser.id !== msg.guild.ownerID) return msg.reply("that role is higher than or equal to in position compared to your highest role!");
        if(rolePos >= yzbotHighRole) return msg.reply("that role is higher than or equal to in position compared to my highest role!");
        memb.removeRole(roleObj, `removerole command executed by ${authorUser.tag}`).catch(console.error);
        msg.reply(`the role **${roleToRemove}** was removed from <@${memb.id}> successfully! | :white_check_mark:`);
      }else{
        return msg.reply("you do not have the ``MANAGE_ROLES`` permission!");
      }
    }else{
      return msg.reply("I do not have the ``MANAGE_ROLES`` permission!");
    }
  }else if(command === "setnick"){
    if(yzbotGM.hasPermission("MANAGE_NICKNAMES") || yzbotGM.hasPermission("ADMINISTRATOR")){
      if(authorGM.hasPermission("MANAGE_NICKNAMES") || authorGM.hasPermission("ADMINISTRATOR") || authorGM.id === msg.guild.ownerID){
        let memb = msg.mentions.members.first();
        if(!memb) return msg.reply("please provide a user to set the nickname of!");
        let authorHighestRole = authorGM.highestRole.position;
        let yzbotHighRole = yzbotGM.highestRole.position;
        let membHighestRole = memb.highestRole.position;
        if(membHighestRole >= authorHighestRole && membHighestRole >= yzbotHighRole && authorUser.id !== msg.guild.ownerID) return msg.reply("that user has a higher or equal role compared to both of us!"); // Does the member have a higher role than the author and yzbot and the author isn't server owner?
        if(membHighestRole >= authorHighestRole && authorUser.id !== msg.guild.ownerID) return msg.reply("that user has a higher or equal role compared to you!"); // Is member's highest role higher or equal to than the message author's? Is the author the server owner?
        if(membHighestRole >= yzbotHighRole) return msg.reply("that user has a higher or equal role compared to me!"); // Is member's highest role greater than or equal to in value than yzbots?
        let inputtedNick = args.slice(1).join(" ");
        if(!inputtedNick) return msg.reply("please provide a nickname to set!");
        if(inputtedNick.length > 32) return msg.reply(`you must enter a nickname that is less than 32 characters long! (${inputtedNick.length} characters were entered).`);
        memb.setNickname(inputtedNick, `${prefix}setnick command executed by ${authorUser.tag}`);
        msg.reply(`nickname of <@${memb.id}> changed to **${inputtedNick}** successfully!`);
      }else{
        return msg.reply("you do not have the ``MANAGE_NICKNAMES`` permission!");
      }
    }else{
      return msg.reply("I do not have the ``MANAGE_NICKNAMES`` permission!");
    }
  }else if(command === "randomtank"){
    if(msg.guild.id !== "396799859900022784") return;
   const tanks = ["Triple Twin", "Battleship", "Octo Tank", "Auto 5",
   "Penta Shot", "Spread Shot", "Triplet", "Overlord", "Necromancer", "Manager",
   "Overtrapper", "Battleship", "Factory", "Ranger", "Stalker", "Booster",
   "Fighter", "Hybrid", "Annihilator", "Skimmer", "Predator", "Streamliner",
   "Tri-Trapper", "Overtrapper", "Gunner Trapper", "Mega Trapper", "Auto Trapper",
   "Landmine", "Spike", "Auto Smasher", "Sprayer", "Auto Gunner", "Rocketeer",
   "Auto 3", "Assassin", "Destroyer", "Gunner", "Hunter", "Overseer", "Quad Tank",
   "Smasher", "Trapper", "Tri-Angle", "Triple Shot", "Twin Flank", "Flank Guard",
   "Machine Gun", "Sniper", "Twin", "Basic Tank"];

   let randIndex = Math.floor(Math.random() * tanks.length) - 1;
   msg.channel.send(`__**Your randomized tank:**__\n\n${tanks[randIndex]}`);
 }else if(command === "invite"){
   client.generateInvite(335932631).then(l=>msg.reply(`invite yzbot to your server using this link: ${l}\n\nYzbot Server: **Coming Soon**`));
 }else if(command === "disablecommand"){
   if(authorGM.hasPermission("MANAGE_SERVER") || authorGM.hasPermission("ADMINISTRATOR")){
     const commandList = [""]; // A list of commands that can be disabled.
   }else{
     return msg.reply("you must have either the ``MANAGE_SERVER`` or ``ADMINISTRATOR`` permission to disable commands!");
   }
 }else if(command === "help"){ // (prefix)help
   const embed = new Discord.RichEmbed()
    .setTitle("All help for yzbot")
    .setDescription(`Prefix from the server you sent this command in: ${prefix}\nThis command will show you how to use all of the commands in yzbot.`)
    .addField(`Information Commands`, `\u200B`)
    .addField(`${prefix}info (category)`, `Get information about the specified category. The four categories are:\nuser, server, role, bot. More information is provided below.`)
    .addField(`${prefix}info user (optional mention)`, `Gets user information about the user mentioned, but if a user isn't mentioned, it gets user information about you.`)
    .addField(`${prefix}info server`, `Gets information about the current server.`)
    .addField(`${prefix}info role (role)`, `Shows information about the provided role.`)
    .addField(`${prefix}info bot`, `Shows information about yzbot.`)
    .addField(`${prefix}help`,/*(category)*/ `Sends information about yzbot's commands to your DMs.`)
    .addBlankField()
    .addField("Moderation Commands", `\u200B`)
    .addField(`${prefix}ban (mention) (optional reason)`, ``)
    .addField("Administration and Configuration Commands", `\u200B`)
    .addField("Fun Commands", `\u200B`)
    .addField("Other Commands", `\u200B`)
    authorGM.send(embed);
    msg.reply("help was sent to your DMs successfully! | :white_check_mark:");
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
