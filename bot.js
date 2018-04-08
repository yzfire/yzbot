const Discord = require("discord.js");
const client = new Discord.Client({
  disableEveryone: true
});

const fs = require("fs");
const ordinal = require("ordinal");
const Enmap = require("enmap");
const EnmapLevel = require("enmap-level");
const ms = require("ms");
const dateFormat = require("dateformat");
const moment = require('moment');
const momentPreciseRangePlugin = require("moment-precise-range-plugin");

const config = JSON.parse(fs.readFileSync("./config.json"), "utf-8");
const helpJSON = JSON.parse(fs.readFileSync("./help.json"), "utf-8");
const token = process.env.TOKEN || config.token;
const devId = config.devID;
const defaultSettings = config.defaultSettings;

// --Start Enmap Declarations.--
// For all by-guild settings.
const guildSettingsSource = new EnmapLevel({name: "guildSettings"});
client.guildSettings = new Enmap({provider: guildSettingsSource});
// For contact blacklist.
const contactBlacklistData = new EnmapLevel({name: "contactBlacklist"});
client.contactBlacklist = new Enmap({provider: contactBlacklistData});
// For normal blacklist.
const blacklistSource = new EnmapLevel({name: "blacklistedPeople"});
client.blacklist = new Enmap({provider: blacklistSource});
// For contact data.
// const contactSource = new EnmapLevel({name: "contactData"});
// client.contactData = new Enmap({provider: contactSource});
// --End Enmap Declarations.--

function setLongTimeout(callback, ms) {
  if (typeof callback !== 'function')
    throw new Error('Callback must be a function');
   ms = parseInt(ms);
   if (Number.isNaN(ms))
    throw new Error('Delay must be an integer');

  var args = Array.prototype.slice.call(arguments,2);
  var cb = callback.bind.apply(callback, [this].concat(args));

  var longTimeout = {
    timer: null,
    clear: function() {
      if (this.timer)
        clearTimeout(this.timer);
    }
  };

  var max = 2147483647;
  if (ms <= max) 
    longTimeout.timer = setTimeout(cb, ms);
  else {
    var count = Math.floor(ms / max); // the number of times we need to delay by max
    var rem = ms % max; // the length of the final delay
    (function delay() {
      if (count > 0) {
        count--;
        longTimeout.timer = setTimeout(delay, max);
      } else {
        longTimeout.timer = setTimeout(cb, rem);
      }
    })();
  }
  return longTimeout;
}

const getMemberCount = () => {
  let amount = 0;
  client.guilds.forEach(c => amount += c.members.size);
  return amount;
}

const clean = text => {
  if (typeof(text) === "string")
    return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
  else
      return text;
}


const setPlayingStatus = () => client.user.setActivity(`;help | ;contact for support | Currently serving ${getMemberCount()} members in ${client.guilds.size} servers.`);

client.on("ready", () => {
  console.log(`[${new Date()}] Logged in as ${client.user.tag} successfully.\nCurrently serving ${getMemberCount()} members in ${client.guilds.size} servers.`);
  client.user.setStatus("dnd");
  setPlayingStatus();
});

client.on("guildCreate", guild => {
  setPlayingStatus();
  const embed = new Discord.RichEmbed();
  embed.setColor("GREEN");
  embed.setTitle(`Added to a server.`);
  embed.addField(`Server Name`, `${guild.name}`, true)
  embed.addField(`Server ID`, `${guild.id}`, true);
  embed.addField(`Channel Amount`, `${guild.channels.size}`);
  embed.addField(`Member Amount`, `${guild.members.size}`);
  embed.setFooter("Server Addition Log");
  embed.setTimestamp();
  client.channels.get("425031283110969345").send({embed}).catch((e) => {
    console.error(`An error occurred in the guildCreate event:\n${e}`);
  });
  if(client.guildSettings.get(guild.id)){
    console.log(`[${new Date()}] Added to ${guild.name}, which already has a database configuration.`);
  }else{
    client.guildSettings.set(guild.id, defaultSettings);
  }
});

client.on("guildDelete", guild => {
  setPlayingStatus();
  const embed = new Discord.RichEmbed();
  embed.setColor("RED");
  embed.setTitle(`Removed from a server.`);
  embed.addField(`Server Name`, `${guild.name}`, true)
  embed.addField(`Server ID`, `${guild.id}`, true);
  embed.addField(`Channel Amount`, `${guild.channels.size}`);
  embed.addField(`Member Amount`, `${guild.members.size}`);
  embed.setFooter("Server Removal Log");
  embed.setTimestamp();
  client.channels.get("425031283110969345").send({embed}).catch((e) => {
      console.error(`An error has occurred in the guildDelete event:\n${e}`);
  });
});

client.on("guildMemberAdd", member => {
  let guildConfig = client.guildSettings.get(member.guild.id);
  if(guildConfig.welcMsg && guildConfig.welcChan){ // Are both set?
    const substituteValues = (message) => {
      let welcomeMessage = message.replace("<USER>", `<@${member.id}>`);
      updatedMessage = welcomeMessage.replace("<SERVERNAME>", member.guild.name);
      secondUpdatedMessage = updatedMessage.replace("<MEMBERCOUNT>", member.guild.members.size);
      thirdUpdatedMessage = secondUpdatedMessage.replace("<MEMBERID>", member.id);
      return thirdUpdatedMessage;
    }

    client.channels.get(guildConfig.welcChan).send(substituteValues(guildConfig.welcMsg)).catch((e) => {
      console.error(`An error has occured in the guildMemberAdd event in ${member.guild.id} at ${new Date()}:\n${e}\n${e.stack}`);
    });
  }
});


client.on("guildMemberRemove", member => {
  let guildConfig = client.guildSettings.get(member.guild.id);
  if(guildConfig.leaveMsg && guildConfig.leaveChan){ // Are both set?
    const substituteValues = (message) => {
      let welcomeMessage = message.replace("<USER>", `<@${member.id}>`);
      updatedMessage = welcomeMessage.replace("<SERVERNAME>", member.guild.name);
      secondUpdatedMessage = updatedMessage.replace("<MEMBERCOUNT>", member.guild.members.size);
      thirdUpdatedMessage = secondUpdatedMessage.replace("<MEMBERID>", member.id);
      return thirdUpdatedMessage;
    }

    client.channels.get(guildConfig.leaveChan).send(substituteValues(guildConfig.leaveMsg)).catch((e) => {
      console.error(`An error has occured in the guildMemberRemove event in ${member.guild.id} at ${new Date()}:\n${e}\n${e.stack}`);
    });
  }
});

let talkedRecently = new Set(); // enables us to cooldown

client.on("message", msg => {
  if(!msg.guild || msg.author.bot || client.blacklist.get(msg.author.id)) return;
  // Cooldown functionality.
  const yzbotGM = msg.guild.me;
  const authorGM = msg.member;
  const authorUser = msg.author;
  if(!client.guildSettings.get(msg.guild.id)) client.guildSettings.set(msg.guild.id, defaultSettings);
  const guildConfig = client.guildSettings.get(msg.guild.id); // We now have access to that object that we set for when the bot was added in a server
  const timeNow = new Date();
  const prefix = guildConfig.prefix;
  const modlogID = guildConfig.modlogID;
  const disabledCommands = guildConfig.disabledCommands;

  if(!msg.content.startsWith(prefix)) return; // if the message content doesn't start with the prefix don't waste time going through all of this stuff
  if(talkedRecently.has(msg.author.id)) return;
  talkedRecently.add(msg.author.id);
  setTimeout(() => {
    talkedRecently.delete(msg.author.id);
  }, 2000);
  const args = msg.content.slice(prefix.length).trim().split(/ +/g); 
  const command = args.shift().toLowerCase(); 

  const logUse = (cmd) => {
    console.log(`[${new Date()}] ${cmd} was used in ${msg.guild.name}`);
  }

  const logErr = (e, cmd, servid) => {
    console.error(`An error has occurred with ${cmd} in ${servid} at ${new Date()}:\n${e}\n${e.stack}`);
  }
  if(command === "ping"){
    logUse("ping");
    const m = msg.channel.send("Pong!...").then(message => {
      message.edit(`:ping_pong: Pong! The ping is currently: **${message.createdTimestamp-msg.createdTimestamp}ms**`);
    });
  }else if(command === "eval"){
    if(msg.author.id !== devId) return;
    logUse("eval");
    try {
      const code = args.join(" ");
      let evaled = eval(code);

      if (typeof evaled !== "string")
        evaled = require("util").inspect(evaled);

      msg.channel.send(clean(evaled), {code:"xl"});
    } catch (err) {
      msg.channel.send(`\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``);
    }

  }else if(command === "prefix"){
    let validOptions = ["set"];
    let option = args[0];
    if(validOptions.includes(option)){
      if(option === "set"){
        if(authorGM.hasPermission("MANAGE_SERVER") || authorGM.hasPermission("ADMINISTRATOR") || authorGM.id === devId || authorGM.id === msg.guild.ownerID){
          logUse("prefix set");
          const prefix = args.slice(1).join(" ");
          if(!prefix) return msg.reply(`please provide a prefix.`);
          if(prefix.length > 8){
            return msg.reply(`the prefix must be 8 characters or less.`);
          }else{
            guildConfig.prefix = prefix;
            client.guildSettings.set(msg.guild.id, guildConfig);
            return msg.reply(`the prefix for this server has been set as **${prefix}** successfully.`);
          }
        }else{
          return msg.reply(`you require the \`\`MANAGE_SERVER\`\` permission to change the bot's prefix in this server.`);
        }
      }
    }else{
      return msg.reply(`please provide a valid option. List of valid options: ${validOptions.join(", ")}`);
    }
  }else if(command === "modlog"){
    let validOptions = ["set", "remove"];
    let option = args[0];
    if(validOptions.includes(option)){
      if(authorGM.hasPermission("MANAGE_SERVER") || authorGM.hasPermission("ADMINISTRATOR") || authorGM.id === msg.guild.ownerID || authorGM.id === devId){
        if(option === "set"){
          logUse("modlog set");
          let channel = msg.mentions.channels.first();
          if(!channel) return msg.reply(`please provide a channel to set as your mod log, for example: #mymodloghere`);
          if(!msg.guild.channels.some(c => c.id === channel.id)) return msg.reply(`that channel is not in this server - you may not set your modlog channel to one outside of it.`);
          guildConfig.modlogID = channel.id;
          client.guildSettings.set(msg.guild.id, guildConfig);
          return msg.reply(`set mod log as <#${channel.id}> successfully!`);
        }else if(option === "remove"){
          logUse("modlog remove");
          if(guildConfig.modlogID === "none") return msg.reply(`you do not have a modlog set.`);
          guildConfig.modlogID = "none";
          client.guildSettings.set(msg.guild.id, guildConfig);
          return msg.reply(`removed the modlog for this server successfully.`);
        }
      }else{
        return msg.reply(`you require the \`\`MANAGE_SERVER\`\` permission to use this command.`);
      }
    }else{
      return msg.reply(`plesae provide a valid option. List of valid options: ${validOptions.join(", ")}`);
    }
  }else if(command === "ban"){
    if(guildConfig.disabledCommands.includes("ban")) return msg.reply(`this command has been disabled by an Admin.`);
    if(yzbotGM.hasPermission("BAN_MEMBERS") || yzbotGM.hasPermission("ADMINISTRATOR")){
      if(authorGM.hasPermission("BAN_MEMBERS") || authorGM.hasPermission("ADMINISTRATOR") || authorGM.id === msg.guild.ownerID){
        let member = msg.mentions.members.first();
        if(!member) return msg.reply(`please mention a member of this server to ban.`)
        let reason = args.slice(1).join(" ");
        if(!reason) reason = "None specified.";
        if(member.id === msg.guild.ownerID) return msg.reply(`you can't ban the owner of this server.`);
        if(authorGM.id === member.id) return msg.reply(`you are trying to ban yourself...`);
        let membHighRole = member.highestRole.position; // Member we want to ban
        let authHighRole = authorGM.highestRole.position; // Message author.
        if(!member.bannable) return msg.reply("I cannot ban this user."); // Checks - can yzbot ban this person.
        if(membHighRole >= authHighRole && !authorGM.id === msg.guild.ownerID) return msg.reply("the specified user has a higher or equal role than you!"); // Checks - can the author ban this person.
        member.ban(`${reason} | Banned by ${authorUser.tag} using yzbot`);
        msg.reply(`banned <@${member.id}> (${member.user.tag}) successfully.`);
        if(modlogID !== "none"){
          let modlog = client.channels.get(modlogID);
          if(!modlog){
            guildConfig.modlog = "none";
            return client.guildSettings.set(msg.guild.id, guildConfig);
          }
          if(modlog.permissionsFor(msg.guild.me).has(["EMBED_LINKS", "READ_MESSAGES", "SEND_MESSAGES"])){
            guildConfig.amtmodlogs += 1;
            client.guildSettings.set(msg.guild.id, guildConfig);
            let amountmodlogs = guildConfig.amtmodlogs;
            const embed = new Discord.RichEmbed();
            embed.setTitle(`Moderation Log #${amountmodlogs}`);
            embed.addField(`Action`, `Ban`);
            embed.addField(`Moderator`, `${authorUser.tag} (<@${authorGM.id}>)`);
            embed.addField(`User`, `${member.user.tag} (<@${member.id}>)`);
            embed.addField(`Reason`, `${reason}`);
            embed.setFooter(`Ban Log - yzbot`);
            embed.setTimestamp();
            client.channels.get(modlogID).send({embed}).catch((e) => {
              logErr(e, "ban (modlog part)", msg.guild.id);
              msg.channel.send(`An error has occurred while attempting to log the ban.\n${e.message}`);
            })
          }else{
            return msg.channel.send(`Please give yzbot the \`\`EMBED_LINKS\`\`, \`\`READ_MESSAGES\`\` and \`\`SEND_MESSAGES\`\` permissions in your mod log channel. Optionally, type ${prefix}modlog remove to remove moderation logs.`);
          }
        }
        logUse("ban");
      }else{
        return msg.reply(`you do not have the \`\`BAN_MEMBERS\`\` permission.`);
      }
    }else{
      return msg.reply(`I do not have the \`\`BAN_MEMBERS\`\` permission.`);
    }
  }else if(command === "kick"){
    if(guildConfig.disabledCommands.includes("kick")) return msg.reply(`this command has been disabled by an Admin.`);
    if(yzbotGM.hasPermission("KICK_MEMBERS") || yzbotGM.hasPermission("ADMINISTRATOR")){
      if(authorGM.hasPermission("KICK_MEMBERS") || authorGM.hasPermission("ADMINISTRATOR") || authorGM.id === msg.guild.ownerID){
        let member = msg.mentions.members.first();
        if(!member) return msg.reply(`please mention a member to kick.`)
        let reason = args.slice(1).join(" ");
        if(!reason) reason = "None specified.";
        if(member.id === msg.guild.ownerID) return msg.reply(`you can't kick the owner of this server.`);
        if(authorGM.id === member.id) return msg.reply(`you are trying to kick yourself...`);
        let membHighRole = member.highestRole.position; // Member we want to kick
        let authHighRole = authorGM.highestRole.position; // Message author.
        if(!member.bannable) return msg.reply("I cannot kick this user."); // Checks - can yzbot kick this person. (If we can't ban them we can't kick them)
        if(membHighRole >= authHighRole && !authorGM.id === msg.guild.ownerID) return msg.reply("the specified user has a higher or equal role than you!"); // Checks - can the author kick this person.
        member.kick(`${reason} | Kicked by ${authorUser.tag} using yzbot`);
        msg.reply(`kicked <@${member.id}> (${member.user.tag}) successfully.`);
        if(modlogID !== "none"){
          let modlog = client.channels.get(modlogID);
          if(!modlog){
            guildConfig.modlog = "none";
            return client.guildSettings.set(msg.guild.id, guildConfig);
          }
          if(modlog.permissionsFor(msg.guild.me).has(["EMBED_LINKS", "READ_MESSAGES", "SEND_MESSAGES"])){
            guildConfig.amtmodlogs += 1;
            client.guildSettings.set(msg.guild.id, guildConfig);
            let amountmodlogs = guildConfig.amtmodlogs;
            const embed = new Discord.RichEmbed();
            embed.setTitle(`Moderation Log #${amountmodlogs}`);
            embed.addField(`Action`, `Kick`);
            embed.addField(`Moderator`, `${authorUser.tag} (<@${authorGM.id}>)`);
            embed.addField(`User`, `${member.user.tag} (<@${member.id}>)`);
            embed.addField(`Reason`, `${reason}`);
            embed.setFooter(`Kick Log - yzbot`);
            embed.setTimestamp();
            client.channels.get(modlogID).send({embed}).catch((e) => {
              logErr(e, "kick (modlog part)", msg.guild.id);
              msg.channel.send(`An error has occured while attempting to log the kick.\n${e.message}`);
            })
          }else{
            return msg.reply(`Please give yzbot the \`\`EMBED_LINKS\`\`, \`\`READ_MESSAGES\`\` and \`\`SEND_MESSAGES\`\` permissions in your mod log channel. Optionally, type ${prefix}modlog remove to remove moderation logs.`);
          }
        }
        logUse("kick");
      }else{
        return msg.reply(`you do not have the \`\`KICK_MEMBERS\`\` permission.`);
      }
    }else{
      return msg.reply(`I do not have the \`\`KICK_MEMBERS\`\` permission.`);
    }
  }else if(command === "role"){ // ;role
    let validOptions = ["add", "remove"];
    let option = args[0];
    if(yzbotGM.hasPermission("MANAGE_ROLES") || yzbotGM.hasPermission("ADMINISTRATOR")){
      if(authorGM.hasPermission("MANAGE_ROLES") || authorGM.hasPermission("ADMINISTRATOR") || authorGM.id === msg.guild.ownerID){
        if(validOptions.includes(option)){
          if(option === "add"){ // ;role add
            if(guildConfig.disabledCommands.includes("role add")) return msg.reply(`this command has been disabled by an Admin.`);
            let memb = msg.mentions.members.first(); // ;role add @yzfire
            let role = args.slice(2).join(" ") // ;role add @yzfire | A Role Here stuff before the | is sliced off, and what's after it is joined into a string separated with spaces.
            if(!memb) return msg.reply(`please provide a member to add the role to.`);
            if(!role) return msg.reply(`please provide a role.`);
            if(!msg.guild.roles.find("name", role)) return msg.reply(`the role specified is not in this server (case-sensitive, make sure you've spelt it right).`);
            let actualRole = msg.guild.roles.find("name", role);
            let authHighRole = authorGM.highestRole.position;
            let rolePos = actualRole.position;
            let yzbotHighRole = yzbotGM.highestRole.position;
            // We need to see if the role is higher than yzbot or the message author.
            if(rolePos >= authHighRole && rolePos >= yzbotHighRole && authorUser.id !== msg.guild.ownerID) return msg.reply("that role is higher than or equal to in position compared to both of our highest roles!");
            if(rolePos >= authHighRole && authorUser.id !== msg.guild.ownerID) return msg.reply("that role is higher than or equal to in position compared to your highest role!");
            if(rolePos >= yzbotHighRole) return msg.reply("that role is higher than or equal to in position compared to my highest role!");
            if(memb.roles.some(r=>[role].includes(r.name))) return msg.reply(`this user already has this role.`);
            memb.addRole(actualRole, `role add command executed by ${authorUser.tag}`).catch((e) => {
              logErr(e, "role add", msg.guild.id);
              msg.channel.send(`An error has occured while attempting to add the role to ${memb.user.tag}.\n${e.message}`);
            });
            msg.reply(`the role **${role}** was added to <@${memb.id}> successfully.`);
          }else if(option === "remove"){
            if(guildConfig.disabledCommands.includes("role remove")) return msg.reply(`this command has been disabled by an Admin.`);
            let memb = msg.mentions.members.first(); // ;role remove @yzfire
            let role = args.slice(2).join(" ") // ;role remove @yzfire | A Role Here stuff before the | is sliced off, and what's after it is joined into a string separated with spaces.
            if(!memb) return msg.reply(`please provide a member to remove the role from.`);
            if(!role) return msg.reply(`please provide a role.`);
            if(!msg.guild.roles.find("name", role)) return msg.reply(`the role specified is not in this server (case-sensitive, make sure you've spelt it right).`);
            let actualRole = msg.guild.roles.find("name", role);
            let authHighRole = authorGM.highestRole.position;
            let rolePos = actualRole.position;
            let yzbotHighRole = yzbotGM.highestRole.position;
            // We need to see if the role is higher than yzbot or the message author.
            if(rolePos >= authHighRole && rolePos >= yzbotHighRole && authorUser.id !== msg.guild.ownerID) return msg.reply("that role is higher than or equal to in position compared to both of our highest roles!");
            if(rolePos >= authHighRole && authorUser.id !== msg.guild.ownerID) return msg.reply("that role is higher than or equal to in position compared to your highest role!");
            if(rolePos >= yzbotHighRole) return msg.reply("that role is higher than or equal to in position compared to my highest role!");
            if(!memb.roles.some(r=>[role].includes(r.name))) return msg.reply(`this user does not have this role.`);
            memb.removeRole(actualRole, `role remove command executed by ${authorUser.tag}`).catch((e) => {
              logErr(e, "role remove", msg.guild.id);
              msg.channel.send(`An error has occured while attempting to remove the role from ${memb.user.tag}.\n${e.message}`);
            });
            msg.reply(`the role **${role}** was removed from <@${memb.id}> successfully.`);
          }
        }else{
          return msg.reply(`that is not a valid option. List of valid options:\n${validOptions.join(", ")}`);
        }
      }else{
        return msg.reply(`you require the \`\`MANAGE_ROLES\`\` permission.`);
      }
    }else{
      return msg.reply(`I do not have the \`\`MANAGE_ROLES\`\` permission.`);
    }
  }else if(command === "mute"){ // ;mute @yzfire 10 minutes This is my reason (;mute @user amount unit reason)
    if(guildConfig.disabledCommands.includes("mute")) return msg.reply(`this command has been disabled by an Admin.`);
    if(yzbotGM.hasPermission("MANAGE_ROLES") || yzbotGM.hasPermission("ADMINISTRATOR")){
      if(authorGM.hasPermission("MANAGE_ROLES") || authorGM.hasPermission("ADMINISTRATOR") || authorGM.id === msg.guild.ownerID){
        logUse("mute");
        let memb = msg.mentions.members.first();
        if(!memb) return msg.reply(`please provide a member to mute.`);
        let timeAmount = args[1];
        if(isNaN(timeAmount)) return msg.reply(`please provide a time amount and then a time unit, like so: ${prefix}mute @yzfire amount unit reason, or ${prefix}mute @yzfire 10 minutes spam`);
        let unit = args[2];
        let reason = args.slice(3).join(" ");
        if(!reason) reason = "None specified.";
        let validTimeFormats = config.mutetimeformats;
        if(!validTimeFormats.includes(unit)) return msg.reply(`please provide a valid time unit in the form ${prefix}mute @yzfire (amount) (unit) (reason). (can be in seconds, minutes, hours, days, weeks, or years.)`);
        const timeString = `${timeAmount} ${unit}`;
        let modlogUnit;
        if(unit === "s" || unit === "sec" || unit === "secs" || unit === "seconds" || unit === "second") modlogUnit = "second(s)";
        if(unit === "m" || unit === "min" || unit === "mins" || unit === "minute" || unit === "minutes") modlogUnit = "minute(s)";
        if(unit === "h" || unit === "hr" || unit === "hrs" || unit === "hour" || unit === "hours") modlogUnit = "hour(s)";
        if(unit === "d" || unit === "day" || unit === "days") modlogUnit = "day(s)";
        if(unit === "w" || unit === "week" || unit === "weeks") modlogUnit = "week(s)";
        if(unit === "y" || unit === "yr" || unit === "yrs" || unit === "year" || unit === "years") modlogUnit = "year(s)";

        if(msg.guild.roles.find("name", "YzbotMuted")){
          // Role exists.
          let muterole = msg.guild.roles.find("name", "YzbotMuted");
          let rolePos = muterole.position;
          let authHighRole = authorGM.highestRole.position;
          let membHighRole = memb.highestRole.position;
          let yzbotHighRole = yzbotGM.highestRole.position;
          // The below checks, in order:
          // Checks if the member has a higher role than the author, if it does, fail
          // If the muted role is higher than yzbot fail
          if(membHighRole >= authHighRole && authorGM.id !== msg.guild.ownerID) return msg.reply(`you cannot mute users with a higher than or equal role compared to you.`);
          if(rolePos >= yzbotHighRole) return msg.reply(`I cannot add the muted role to this user as it is in a higher position than my highest role.`);
          if(memb.roles.some(r=>["YzbotMuted"].includes(r.name))) return msg.reply(`this user is already muted.`);
          memb.addRole(muterole, `mute command executed by ${authorUser.tag}`).catch((e) => {
            return logErr(e, "mute", msg.guild.id);
          });
          let unmuteTime = ms(timeString);
          msg.reply(`user <@${memb.id}> muted successfully.`);
          setLongTimeout(() => {
            memb.removeRole(muterole, `Auto unmute from yzbot.`);
            if(modlogID !== "none"){
              let modlog = client.channels.get(modlogID);
              if(!modlog){
                guildConfig.modlog = "none";
                return client.guildSettings.set(msg.guild.id, guildConfig);
              }
              if(modlog.permissionsFor(msg.guild.me).has(["EMBED_LINKS", "READ_MESSAGES", "SEND_MESSAGES"])){
                guildConfig.amtmodlogs += 1;
                client.guildSettings.set(msg.guild.id, guildConfig);
                let amountmodlogs = guildConfig.amtmodlogs;
                const embed = new Discord.RichEmbed();
                embed.setTitle(`Moderation Log #${amountmodlogs}`);
                embed.addField(`Action`, `Unmute`);
                embed.addField(`Moderator`, `<@${client.user.id}> (yzbot)`, true);
                embed.addField(`User`, `${memb.user.tag} (<@${memb.id}>)`, true);
                embed.addField("Reason", "Automatic unmute.");
                embed.setFooter(`Unmute Log - yzbot`);
                embed.setTimestamp();
                client.channels.get(modlogID).send({embed}).catch((e) => {
                  logErr(e, "unmute (modlog part)", msg.guild.id);
                  msg.channel.send(`An error has occured while attempting to log the unmute of ${memb.user.tag}.\n${e.message}`);
                });
              }else{
                return /*msg.channel.send(`Please give yzbot the \`\`EMBED_LINKS\`\`, \`\`READ_MESSAGES\`\`, and \`\`SEND_MESSAGES\`\` permissions in your mod log channel if you want moderation logs. Optionally, type ${prefix}modlog remove to remove moderation logs.`)*/;
              }
            }
          }, unmuteTime);
          if(modlogID !== "none"){
            let modlog = client.channels.get(modlogID);
            if(!modlog){
              guildConfig.modlog = "none";
              return client.guildSettings.set(msg.guild.id, guildConfig);
            }
            if(modlog.permissionsFor(msg.guild.me).has(["EMBED_LINKS", "READ_MESSAGES", "SEND_MESSAGES"])){
              guildConfig.amtmodlogs += 1;
              client.guildSettings.set(msg.guild.id, guildConfig);
              let amountmodlogs = guildConfig.amtmodlogs;
              const embed = new Discord.RichEmbed();
              embed.setTitle(`Moderation Log #${amountmodlogs}`);
              embed.addField(`Action`, `Mute`);
              embed.addField(`Moderator`, `${authorUser.tag} (<@${authorGM.id}>)`, true);
              embed.addField(`User`, `${memb.user.tag} (<@${memb.id}>)`, true);
              embed.addField(`Reason`, `${reason}`, true);
              embed.addField(`Time muted`, `${timeAmount} ${modlogUnit}`, true)
              embed.setFooter(`Mute Log - yzbot`);
              embed.setTimestamp();
              client.channels.get(modlogID).send({embed}).catch((e) => {
                logErr(e, "mute (modlog part)", msg.guild.id);
                msg.channel.send(`An error has occured while attempting to log the mute.\n${e.message}`);
              })
            }else{
              return msg.channel.send(`Please give yzbot the \`\`EMBED_LINKS\`\`, \`\`READ_MESSAGES\`\`, and \`\`SEND_MESSAGES\`\` permissions in your mod log channel if you want moderation logs. Optionally, type ${prefix}modlog remove to remove moderation logs.`);
            }
          }
          // Unmute.
        }else{
          // Otherwise, make the role and mute.
          msg.guild.createRole({
            name: "YzbotMuted",
            color: "#808080",
            permissions: 0
          }).then(r => {
            r.guild.channels.forEach(c => {
              c.overwritePermissions(r, {
                SEND_MESSAGES: false
              })
            });
            let muterole = msg.guild.roles.find("name", "YzbotMuted");
            if(!muterole) return msg.reply("the muted role does not exist. (Please don't change the name of it or it won't work).");
            let rolePos = muterole.position;if(!muterole) return msg.reply("the muted role does not exist. (Please don't change the name of it or it won't work).");
            let authHighRole = authorGM.highestRole.position;
            let membHighRole = memb.highestRole.position;
            let yzbotHighRole = yzbotGM.highestRole.position;
            // The below checks, in order:
            // Checks if the member has a higher role than the author, if it does, fail
            // If the muted role is higher than yzbot fail
            if(membHighRole >= authHighRole && authorGM.id !== msg.guild.ownerID) return msg.reply(`you cannot mute users with a higher than or equal role compared to you.`);
            if(rolePos >= yzbotHighRole) return msg.reply(`I cannot add the muted role to this user as it is in a higher position than my highest role.`);
            if(memb.roles.some(r=>["YzbotMuted"].includes(r.name))) return msg.reply(`this user is already muted.`);
            let unmuteTime = ms(timeString);
            memb.addRole(muterole, `mute command executed by ${authorUser.tag}`).catch((e) => {
              return logErr(e, "mute", msg.guild.id);
            });
            msg.reply(`user <@${memb.id}> muted successfully.`);
            // Unmute.
            setLongTimeout(() => {
              memb.removeRole(muterole, `Auto unmute from yzbot.`);
              if(modlogID !== "none"){
                let modlog = client.channels.get(modlogID);
                if(!modlog){
                  guildConfig.modlog = "none";
                  return client.guildSettings.set(msg.guild.id, guildConfig);
                }
                if(modlog.permissionsFor(msg.guild.me).has(["EMBED_LINKS", "READ_MESSAGES", "SEND_MESSAGES"])){
                  guildConfig.amtmodlogs += 1;
                  client.guildSettings.set(msg.guild.id, guildConfig);
                  let amountmodlogs = guildConfig.amtmodlogs;
                  const embed = new Discord.RichEmbed();
                  embed.setTitle(`Moderation Log #${amountmodlogs}`);
                  embed.addField(`Action`, `Unmute`);
                  embed.addField(`Moderator`, `<@${client.user.id}> (yzbot)`, true);
                  embed.addField(`User`, `${memb.user.tag} (<@${memb.id}>)`, true);
                  embed.addField("Reason", "Automatic unmute.");
                  embed.setFooter(`Unmute Log - yzbot`);
                  embed.setTimestamp();
                  client.channels.get(modlogID).send({embed}).catch((e) => {
                    logErr(e, "mute (modlog part)", msg.guild.id);
                    return msg.channel.send(`An error has occured while attempting to log the unmute of ${memb.user.tag}.\n${e.message}`);
                  });
                }else{
                  return /*msg.channel.send(`Please give yzbot the \`\`EMBED_LINKS\`\`, \`\`READ_MESSAGES\`\`, and \`\`SEND_MESSAGES\`\` permissions in your mod log channel if you want moderation logs. Optionally, type ${prefix}modlog remove to remove moderation logs.`)*/;
                }
              }
            }, unmuteTime);
            if(modlogID !== "none"){
              let modlog = client.channels.get(modlogID);
              if(!modlog){
                guildConfig.modlog = "none";
                return client.guildSettings.set(msg.guild.id, guildConfig);
              }
              if(modlog.permissionsFor(msg.guild.me).has(["EMBED_LINKS", "READ_MESSAGES", "SEND_MESSAGES"])){
                guildConfig.amtmodlogs += 1;
                client.guildSettings.set(msg.guild.id, guildConfig);
                let amountmodlogs = guildConfig.amtmodlogs;
                const embed = new Discord.RichEmbed();
                embed.setTitle(`Moderation Log #${amountmodlogs}`);
                embed.addField(`Action`, `Mute`);
                embed.addField(`Moderator`, `${authorUser.tag} (<@${authorGM.id}>)`, true);
                embed.addField(`User`, `${memb.user.tag} (<@${memb.id}>)`, true);
                embed.addField(`Reason`, `${reason}`, true);
                embed.addField(`Time muted`, `${timeAmount} ${modlogUnit}`, true)
                embed.setFooter(`Mute Log - yzbot`);
                embed.setTimestamp();
                client.channels.get(modlogID).send({embed}).catch((e) => {
                  logErr(e, "mute (modlog part)", msg.guild.id);
                  msg.channel.send(`An error has occured while attempting to log the mute.\n${e.message}`);
                })
              }else{
                return msg.channel.send(`Please give yzbot the \`\`EMBED_LINKS\`\`, \`\`READ_MESSAGES\`\`, and \`\`SEND_MESSAGES\`\` permissions in your mod log channel if you want moderation logs. Optionally, type ${prefix}modlog remove to remove moderation logs.`);
              }
            }
            }).catch((e) => {
              logErr(e, "mute (overwriting perms)", msg.guild.id);
            })
        }
      }else{
        return msg.reply(`you require the \`\`MANAGE_ROLES\`\` permission to use this command.`);
      }
    }else{
      return msg.reply(`I do not have the \`\`MANAGE_ROLES\`\` permission required to mute members.`);
    }
  }else if(command === "unmute"){
    if(guildConfig.disabledCommands.includes("unmute")) return msg.reply(`this command has been disabled by an Admin.`);
    if(yzbotGM.hasPermission("MANAGE_ROLES") || yzbotGM.hasPermission("ADMINISTRATOR")){
      if(authorGM.hasPermission("MANAGE_ROLES") || authorGM.hasPermission("ADMINISTRATOR")){
        let memb = msg.mentions.members.first();
        let reason = args.slice(1).join(" ");
        if(!memb) return msg.reply(`please provide a member to unmute.`);
        if(!reason) reason = "None specified.";
        let muteRoleObj = msg.guild.roles.find("name", "YzbotMuted");
        if(!muteRoleObj) return msg.reply(`the muted role does not exist! Please do not rename it from 'YzbotMuted' or it won't work.`);
        if(!memb.roles.some(r=>["YzbotMuted"].includes(r.name))) return msg.reply(`this user is not muted.`);
        let muteRolePos = muteRoleObj.position;
        let yzbotHighRole = yzbotGM.highestRole.position;
        if(muteRolePos >= yzbotHighRole) return msg.reply(`I cannot unmute this user as the muted role is higher than or equal to in position compared to my highest role.`);
        memb.removeRole(muteRoleObj, `unmute command done by ${msg.author.tag}`).catch((e) => {
          logErr(e, "unmute", msg.guild.id);
          return msg.channel.send(`An error has occured while attempting to unmute ${memb.user.tag}\n${e.message}`);
        });
        msg.reply(`unmuted <@${memb.id}> successfully.`);
        if(modlogID !== "none"){
          let modlog = client.channels.get(modlogID);
          if(!modlog){
            guildConfig.modlog = "none";
            return client.guildSettings.set(msg.guild.id, guildConfig);
          }
          if(modlog.permissionsFor(msg.guild.me).has(["EMBED_LINKS", "READ_MESSAGES", "SEND_MESSAGES"])){
            guildConfig.amtmodlogs += 1;
            client.guildSettings.set(msg.guild.id, guildConfig);
            let amountmodlogs = guildConfig.amtmodlogs;
            const embed = new Discord.RichEmbed();
            embed.setTitle(`Moderation Log #${amountmodlogs}`);
            embed.addField(`Action`, `Unmute`);
            embed.addField(`Moderator`, `<@${authorUser.id}> (${authorUser.tag})`, true);
            embed.addField(`User`, `${memb.user.tag} (<@${memb.id}>)`, true);
            embed.addField("Reason", `${reason}`);
            embed.setFooter(`Unmute Log - yzbot`);
            embed.setTimestamp();
            client.channels.get(modlogID).send({embed}).catch((e) => {
              logErr(e, "mute (modlog part)", msg.guild.id);
              return msg.channel.send(`An error has occured while attempting to log the unmute of ${memb.user.tag}.\n${e.message}`);
            });
          }else{
            return msg.channel.send(`Please give yzbot the \`\`EMBED_LINKS\`\`, \`\`READ_MESSAGES\`\`, and \`\`SEND_MESSAGES\`\` permissions in your mod log channel if you want moderation logs. Optionally, type ${prefix}modlog remove to remove moderation logs.`);
          }
        }
      }else{
        return msg.reply(`you require the \`\`MANAGE_ROLES\`\` permission to use this command.`);
      }
    }else{
      return msg.reply(`I do not have the \`\`MANAGE_ROLES\`\` permission required to unmute members.`);
    }
  }else if(command === "8ball"){
    if(guildConfig.disabledCommands.includes("8ball")) return msg.reply(`this command has been disabled by an Admin.`);
    const answers = config.magicballanswers;
    let question = args.join(" ");
    if(!question || question.length < 3) return msg.reply(`please provide a question.`);
    const waitReps = ["Waiting for the Magic 8 Ball to give an answer...", "Thinking about your question...", "Allowing time for the wisdom of the Magic 8 Ball to provide an answer..."];
    const randColours = ["#ff0000", "#00ff00"];
    const m = msg.channel.send(`${waitReps[Math.floor(Math.random() * waitReps.length)]}`).then((message) => {
      if(yzbotGM.hasPermission("EMBED_LINKS")){
        const embed = new Discord.RichEmbed()
          .setColor(`${randColours[Math.floor(Math.random() * randColours.length)]}`)
          .setTitle(`Magic :8ball: Ball`)
          .setDescription("The wisdom of the Magic 8 Ball shall guide you.")
          .addField(`Question`, `:question: ${question}`)
          .addField(`Answer`, `:8ball: ${answers[Math.floor(Math.random() * answers.length)]}`)
          .setTimestamp()
          message.edit({embed}).catch((e) => {
            msg.channel.send(`An error occured, sorry about that. Please inform yzfire that the following error is occuring, so that he can find out why this is (use ${prefix}invite for the invite to support server):\n${e.message}`);
            logErr(e, "8ball", msg.guild.id);
          });
      }else{
        message.edit(`__**Magic :8ball: Ball**__
          \n\nThe wisdom of the Magic 8 Ball shall guide you.
          \n\n\nQuestion: :question: ${question}
          \nAnswer: :8ball: ${answers[Math.floor(Math.random() * answers.length)]}`);
      }}).catch((e) => {
        msg.channel.send(`An error occured, sorry about that. Please inform yzfire that the following error is occuring, so that he can find out why this is (use ${prefix}invite for the invite to support server):\n${e.message}`);
        logErr(e, "8ball", msg.guild.id);
      });
    }else if(command === "lenny"){
      if(guildConfig.disabledCommands.includes("lenny")) return msg.reply(`this command has been disabled by an Admin.`);
      return msg.channel.send("( ͡° ͜ʖ ͡°)");
    }else if(command === "hackban"){
      if(guildConfig.disabledCommands.includes("hackban")) return msg.reply(`this command has been disabled by an Admin.`);
      if(yzbotGM.hasPermission("BAN_MEMBERS") || yzbotGM.hasPermission("ADMINISTRATOR")){ // Can yzbot ban?
        if(authorGM.hasPermission("BAN_MEMBERS") || authorGM.hasPermission("ADMINISTRATOR") || authorGM.id === msg.guild.ownerID){ // Can author ban members?
          let membId = args[0];
          if(!membId) return msg.reply("please provide an ID."); // Did they supply an ID at all?
          if(isNaN(membId) || membId.length !== 18) return msg.reply("please provide a valid user ID."); // Is the supplied ID a number? Does it have a length of 18 characters exactly?
          if(membId === authorUser.id) return msg.reply("you cannot (hack/ID)ban yourself.");
          if(msg.guild.members.get(membId)) return msg.reply(`this member is already in the server - use ${prefix}ban.`);
          let reason = args.slice(1).join(" "); // The rest of their argument.
          if(!reason) reason = "None specified."; // Give reason a value so we avoid getting some sort of error.
          msg.guild.ban(membId, `${reason} | Hackbanned by ${authorUser.tag} using yzbot.`).then(m => {
            msg.reply(`user with ID ${membId} (<@${membId}>) banned successfully.`);
            if(modlogID !== "none"){
              let modlog = client.channels.get(modlogID);
              if(!modlog){
                guildConfig.modlog = "none";
                return client.guildSettings.set(msg.guild.id, guildConfig);
              }
              if(modlog.permissionsFor(msg.guild.me).has(["EMBED_LINKS", "READ_MESSAGES", "SEND_MESSAGES"])){
                guildConfig.amtmodlogs += 1;
                client.guildSettings.set(msg.guild.id, guildConfig);
                let amountmodlogs = guildConfig.amtmodlogs;
                const embed = new Discord.RichEmbed()
                  .setTitle(`Moderation Log #${amountmodlogs}`)
                  .addField("Action:", "Hackban (ID Banned)")
                  .addField("Moderator", `<@${msg.author.id}>`)
                  .addField("User Punished", `<@${membId}> (ID: ${membId})`)
                  .addField("Reason", `${reason}`)
                  .setFooter("Hackban Log - yzbot")
                  .setTimestamp()
                  client.channels.get(modlogID).send({embed}).catch((e) => {
                    logErr(e, "hackban", msg.guild.id);
                    return msg.channel.send(`An error has occured while attempting to log the hackban.\n${e.message}`);
                  });
              }else{
                return msg.channel.send(`Please give yzbot the \`\`EMBED_LINKS\`\`, \`\`READ_MESSAGES\`\`, and \`\`SEND_MESSAGES\`\` permissions in your mod log channel if you want moderation logs. Optionally, type ${prefix}modlog remove to remove moderation logs.`);
              }
            }
          }).catch((e) => {
            logErr(e, "hackban", msg.guild.id);
            if(e.message === "Unknown User"){
              return msg.reply(`the ID ${membId} does not belong to any Discord user.`);
            }else{
              return msg.channel.send(`An error has occurred while attempting to hackban this user.\n\`\`${e.message}\`\``);
            }
          });
      }else{
        return msg.reply("you do not have the ``BAN_MEMBERS`` permission!")
      }
    }else{
      return msg.reply("I do not have the ``BAN_MEMBERS`` permission!");
    }
  }else if(command === "clear"){
    if(guildConfig.disabledCommands.includes("clear")) return msg.reply(`this command has been disabled by an Admin.`);
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
          setTimeout(del, 1500); // delete in 3 seconds
        });
      }else{
        return msg.reply("you do not have the ``MANAGE_MESSAGES`` permission!");
      }
    }else{
      return msg.reply("I do not have the ``MANAGE_MESSAGES`` permission!");
    }
  }else if(command === "command"){
    if(authorGM.hasPermission(32) || authorGM.hasPermission(8) || authorUser.id === msg.guild.ownerID){ 
      let option = args[0];
      let possibleOptions = ["enable", "disable", "listdisabled"];
      if(!possibleOptions.includes(option)) return msg.reply(`you did not provide a valid option. List of valid options: ${possibleOptions.join(", ")}`);
      const commandList = config.disablableCommands; // A list of commands that can be disabled. help, ping and config commands can't be disabled.
      if(option === "disable"){
        logUse("command disable");
        const toDisable = args.slice(1).join(" ");
        if(!toDisable) return msg.reply(`please provide a command to disable. Here's a list of those which can be disabled:\n${commandList.join(", ")}`);
        if(!commandList.includes(toDisable)) return msg.reply(`that command does not exist, or it cannot be disabled. List of commands that can be disabled:\n${commandList.join(", ")}`);
        if(guildConfig.disabledCommands.includes(toDisable)) return msg.reply(`that command is already disabled.`);
        guildConfig.disabledCommands.push(toDisable);
        client.guildSettings.set(msg.guild.id, guildConfig);
        msg.reply(`the command **${toDisable}** was disabled successfully.`);
      }else if(option === "enable"){
        logUse("command enable");
        const toEnable = args.slice(1).join(" ");
        if(!toEnable) return msg.reply("please provide a command to enable.");
        if(!commandList.includes(toEnable)) return msg.reply("that command does not exist, or it cannot be disabled in the first place.");
        if(!guildConfig.disabledCommands.includes(toEnable)) return msg.reply("that command is not disabled.");
        let commIndex = guildConfig.disabledCommands.indexOf(toEnable);
        guildConfig.disabledCommands.splice(commIndex, 1);
        client.guildSettings.set(msg.guild.id, guildConfig);
        msg.reply(`the command **${toEnable}** was reenabled successfully.`);
      }else if(option === "listdisabled"){
        logUse('command listdisabled');
        if(guildConfig.disabledCommands.length >= 1){
          return msg.reply(`the list of disabled commands for the server **${msg.guild.name}** is:\n${guildConfig.disabledCommands.join(", ")}`);
        }else{
          return msg.reply(`no commands are disabled!`);
        }
      }
    }else{
      return msg.reply(`you must have either the \`\`MANAGE_SERVER\`\` or \`\`ADMINISTRATOR\`\` permission to look at the list of disabled commands, or to disable and enable them.`)
    }
  }else if(command === "say"){
    if(authorGM.id !== devId) return;
    logUse("say");
    let phrase = args.join(" ");
    msg.channel.send(phrase);
    msg.delete().catch((e) => {
      logErr(e, "say (deleting original message)", msg.guild.id);
    });
  }else if(command === "info"){
    let specifiedCategory = args[0];
    let acceptableCategories = ["user", "server", "role", "bot", "channels", "roles"]; //Acceptable categories for info command.
    if(!acceptableCategories.includes(specifiedCategory)) return msg.reply(`please specify a valid category! The valid categories are listed below:\n\n${acceptableCategories.join(", ")}`);
    if(specifiedCategory === "user"){ // ;info user
      if(guildConfig.disabledCommands.includes("info user")) return msg.reply(`this command has been disabled by an Admin.`);
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
          .addField("ID", `${memb.id}`, true)
          .addField("Account Created", `${memb.user.createdAt}`, true)
          .addField("Avatar URL", `[Click here](${memb.user.displayAvatarURL})`, true)
          .addField("Highest Role", `${highestRole}`, true)
          .addField("Status", `${userStatus}`, true)
          .addField(`Roles (Amount)`, `${memb.roles.size}`, true)
          .setFooter(`User info requested by ${authorUser.tag}`)
          .setTimestamp()
          msg.channel.send({embed});
      }else{ // can't send embeds
        let timeFormatted = dateFormat(timeNow, "dS mmm, yyyy - h:MM TT"); // Use date format module for easy formatting of dates
        msg.channel.send(`:warning: **I do not have \`\`EMBED_LINKS\`\` permissions, if you want a better version of this please enable it for yzbot.** :warning:
        \n\n__**User info of ${memb.user.tag}:**__
        \n\n\n**ID:** ${memb.id}
        \n\n**Account Created:** ${memb.user.createdAt}
        \n\n**Avatar URL:** ${memb.user.displayAvatarURL}
        \n\n**Highest Role:** ${highestRole}
        \n\n**Status:** ${userStatus}
        \n\n**Roles (Amount):** ${memb.roles.size}
        \n\n\n__User info requested by ${authorUser.tag} | ${timeFormatted}__`);
      }
    }else if(specifiedCategory === "server"){
      if(guildConfig.disabledCommands.includes("info server")) return msg.reply(`this command has been disabled by an Admin.`);
      let highestPosition = msg.guild.roles.size - 1;
      let highRole2 = msg.guild.roles.find("position", highestPosition);
      let highRole = highRole2.name;
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
      let guildCreatedRaw = msg.guild.createdAt;
      let guildCreated = dateFormat(guildCreatedRaw, "UTC:dddd, dS mmmm, yyyy - h:MM:ss TT");
    if(yzbotGM.hasPermission("EMBED_LINKS") || yzbotGM.hasPermission("ADMINISTRATOR")){
      const embed = new Discord.RichEmbed()
        .setTitle(`Information about the server ${msg.guild.name}`)
        .addField(`Members`, `${msg.guild.memberCount}`, true)
        .addField(`Owner`, `${msg.guild.owner.user.tag} (${msg.guild.owner})`, true)
        .addField(`Region`, `${msg.guild.region}`, true)
        .addField(`Verification Level`, `${verification_level}`, true)
        .addField(`Number of roles`, `${msg.guild.roles.size}`, true)
        .addField(`Highest Role`, `${highRole}`, true)
        .addField(`Server Created`, `${guildCreated} (UTC Time)`, true)
        .setFooter(`Server ID: ${msg.guild.id}`)
        .setTimestamp()
        msg.channel.send({embed}).catch((e) => {
          msg.channel.send(`An error, \`\`${e.message}\`\`, occured.`);
          logErr(e, "info server", msg.guild.id);
        });
    }else{ // it can't send embeds
    let timeFormatted = dateFormat(timeNow, "dS mmm, yyyy - h:MM TT"); // Use date format module for easy formatting of dates
    msg.channel.send(`:warning: **I do not have \`\`EMBED_LINKS\`\` permissions, if you want a better version of this please enable it for yzbot.** :warning:
      \n\n__**Information about the server ${msg.guild.name}:**__
      \n\n\n**Members**: ${msg.guild.memberCount}
      \n\n**Owner**: ${msg.guild.owner.user.tag} (ID: ${msg.guild.ownerID})
      \n\n**Region**: ${msg.guild.region}
      \n\n**Number of roles**: ${msg.guild.roles.size}
      \n\n**Highest Role**: ${highRole.name}
      \n\n**Server Created**: ${guildCreated} (UTC Time)
      \n\n**Verification Level**: ${verification_level}
      \n\n\n__Server ID: ${msg.guild.id} | ${timeFormatted}__`);
    }
  }else if(specifiedCategory === "role"){
    if(guildConfig.disabledCommands.includes("info role")) return msg.reply(`this command has been disabled by an Admin.`);
    let wantedRole = args.slice(1).join(" "); // The word role is actually args[0] so we have to slice from 1 and join them all up (e.g. ["role", "Bot", "Developer"]) - in that case we'd want to join bot and developer together with a space.
    if(!wantedRole) return msg.reply("please provide a role!");
    if(!msg.guild.roles.find("name", wantedRole)) return msg.reply("that role is not in this server, or you have typed the role name incorrectly (case-sensitive)!");
    let roleObj = msg.guild.roles.find("name", wantedRole);
    let onsidebar;
    let isrolementionable;
    if(roleObj.hoist === true){
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
        if(roleObj.members.size === 0) return 0;
        let membArr = roleObj.members.array().map(m=>m.id);
        let mentionArr = membArr.map(memb=>`<@${memb}>`)
        let finalMentions = mentionArr.join(", ");
        return finalMentions;
      }else{
        return roleObj.members.size;
      }
    }

    let roleCreatedRaw = roleObj.createdAt;
    let roleCreated = dateFormat(roleCreatedRaw, "UTC:dddd, dS mmmm, yyyy - h:MM:ss TT");
    let relativePos = ordinal(msg.guild.roles.size - roleObj.position);
    relativePos = ` ${relativePos} `;
    if(relativePos === " 1st ") relativePos = " ";

    if(yzbotGM.hasPermission("EMBED_LINKS") || yzbotGM.hasPermission("ADMINISTRATOR")){
      const embed = new Discord.RichEmbed()
        .setTitle(`${wantedRole}`)
        .setColor(`${roleObj.hexColor}`)
        .addField("Permission Number (Use converter to see)", `${roleObj.permissions}`)
        .addField("Position", `${parseInt(roleObj.position)+2}\nThat means this role is the${relativePos}highest role!`)
        .addField("Role Created", `${roleCreated} (UTC Time)`)
        .addField(`Members`, `${getRoleMembers()} ${roleObj.members.size !== 0  && roleObj.members.size < 30 ? `(${roleObj.members.size})` : `\u200B`}`)
        .addField("Colour", `${roleObj.hexColor}`)
        .addField("Role ID:", `${roleObj.id}`, true)
        .addField("On Sidebar", `${onsidebar}`, true)
        .addField("Mentionable", `${isrolementionable}`, true)
        .setTimestamp()
        msg.channel.send({embed}).catch((e) => {
          msg.channel.send(`An error, \`\`${e.message}\`\`, occured.`);
          logErr(e, "info role", msg.guild.id);
        })
    }else{ // Can't send embeds!
      let timeFormatted = dateFormat(timeNow, "dS mmm, yyyy - h:MM TT");
      msg.channel.send(`:warning: **I do not have \`\`EMBED_LINKS\`\` permissions, if you want a better version of this please enable it for yzbot.** :warning:
        \n\n\n__**${wantedRole}:**__
        \n\n**Permission Number (Use converter to see)**: ${roleObj.permissions}
        \n\n**Position: ${parseInt(roleObj.position)+1}\nThat means this role is the${relativePos}highest role!
        \n\n**Role Created**: ${roleCreated}
        \n\n**Colour**: ${roleObj.hexColor}
        \n\n**On Sidebar**: ${onsidebar}
        \n\n**Mentionable**: ${isrolementionable}
        \n\n**Members**: ${roleObj.members.size}
        \n\n**ID**: ${roleObj.id}
        \n\n\n__${timeFormatted}__
        `);
    }
  }else if(specifiedCategory === "bot"){
    if(guildConfig.disabledCommands.includes("info bot")) return msg.reply(`this command has been disabled by an Admin.`);
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

    let onlineTimeRaw = client.readyAt;
    let onlineTime = dateFormat(onlineTimeRaw, "UTC:dddd, dS mmmm, yyyy - h:MM:ss TT");
    let createdTimeRaw = client.user.createdAt;
    let createdTime = dateFormat(createdTimeRaw, "UTC:dddd, dS mmmm, yyyy - h:MM:ss TT");

    if(yzbotGM.hasPermission("EMBED_LINKS") || yzbotGM.hasPermission("ADMINISTRATOR")){
  		const embed = new Discord.RichEmbed()
  			.setTitle("Information about yzbot")
  			.setThumbnail(`${client.user.displayAvatarURL}`)
  			.setDescription("Thanks for using yzbot. This is a multifunctional, fast and secure Discord bot with features such as moderation and fun commands. This bot is also configurable to whatever your server suits, with the configuration commands found in the help config(uration)/admin command. Finally, to any programmers out there, this bot is [open-source](https://github.com/yzfire/yzbot)!")      
  			.addField("Developer:", `yzfire#6822 (<@${devId}>)`, true)
        .addField("Version:", `${config.version}`, true)
  			.addField("Online Since:", `${onlineTime} (UTC Time)`)
  			.addField("ID:", `${client.user.id}`)
  			.addField("Status:", `${status}`)
  			.addField("Servers:", `${client.guilds.size}`, true)
  			.addField("Channels:", `${client.channels.size}`, true)
        .addField("Members:", `${getMemberCount()}`, true)
  			.addField("Created:", `${createdTime} (UTC Time)`)
  			.addField("GitHub:", "https://github.com/yzfire/yzbot")
  			.setFooter(`yzbot information (requested by ${authorUser.tag})`)
  			.setTimestamp()
  			msg.channel.send({embed}).catch((e) => {
          msg.channel.send(`An error, \`\`${e.message}\`\`, has occurred.`);
          logErr(e, "info bot", msg.guild.id);
        });
    }else{ // Can't embed.
    let timeFormatted = dateFormat(timeNow, "dS mmm, yyyy - h:MM TT");
    msg.channel.send(`:warning: **I do not have \`\`EMBED_LINKS\`\` permissions, if you want a better version of this please enable it for yzbot.** :warning:
      \n\n\n__**Information about yzbot:**__
      \n\nThanks for using yzbot. This is a multifunctional, fast and secure Discord bot with features such as moderation and fun commands. This bot is also configurable to whatever your server suits, with the configuration commands found in the help config(uration)/admin command. Finally, to any programmers out there, this bot is open-source! (https://github.com/yzfire/yzbot).
      \n\n**Version**: ${config.version}
      \n\n**Online Since**: ${onlineTime} (UTC Time)
      \n\n**ID**: ${client.user.id}
      \n\n**Status**: ${status}
      \n\n**Servers**: ${client.guilds.size}
      \n\n**Channels**: ${client.channels.size}
      \n\n**Members**: ${getMemberCount()}
      \n\n**Created**: ${createdTime} (UTC Time)
      \n\n**GitHub**: https://github.com/yzfire/yzbot
      \n\n\n__yzbot information (requested by ${authorUser.tag}) | ${timeFormatted}__
      `);
    }
  }else if(specifiedCategory === "channels"){
    if(guildConfig.disabledCommands.includes("info channels")) return msg.reply(`this command has been disabled by an Admin.`);
    let textChannels = msg.guild.channels.array().filter(c => c.type === "text");
    let channelList = textChannels.map(c => `#${c.name}`);
    const embed = new Discord.RichEmbed()
      .setTitle(`Channels in server ${msg.guild.name}`)
      .addField(`${msg.guild.name} has ${textChannels.length} channels (text).`, `\`\`\`${channelList.join(", ")}\`\`\``)
      .setTimestamp()
      authorGM.send(embed).then(m => {
        msg.reply(`information sent to your DMs successfully.`)
      }).catch((e) => {
        logErr(e, "info roles", msg.guild.id);
        if(e.message === "Cannot send messages to this user"){
          return msg.reply(`I was unable to send you the requested information as I cannot send Direct Messages to you.`);
        }else{
          return msg.channel.send(`An error occured, sorry about that.\n\`\`${e.message}\`\``);
        }
      });

  }else if(specifiedCategory === "roles"){
    if(guildConfig.disabledCommands.includes("info roles")) return msg.reply(`this command has been disabled by an Admin.`);
    let roleList = msg.guild.roles.array().map(r => r.name);
    const embed = new Discord.RichEmbed()
      .setTitle(`Roles in server ${msg.guild.name}`)
      .addField(`${msg.guild.name} has ${msg.guild.roles.size} roles.`, `\`\`\`${roleList.join(", ")}\`\`\``)
      .setTimestamp()
      authorGM.send(embed).then(m => {
        msg.reply(`information sent to your DMs successfully.`);
      }).catch((e) => {
        logErr(e, "info roles", msg.guild.id);
        if(e.message === "Cannot send messages to this user"){
          return msg.reply(`I was unable to send you the requested information as I cannot send Direct Messages to you.`)
        }else{
          msg.channel.send(`An error occured, sorry about that.\n\`\`${e.message}\`\``);
        }
      });

  }
  }else if(command === "serverconfig"){
    if(authorGM.hasPermission(32) || authorGM.hasPermission(8) || authorUser.id === msg.guild.ownerID){ // Does the author have appropriate perms?
      if(yzbotGM.hasPermission("EMBED_LINKS") || yzbotGM.hasPermission("ADMINISTRATOR")){
        let modlogChan = `<#${guildConfig.modlog}>`;
        let joinChan = `<#${guildConfig.welcChannel}>`;
        let byeChan = `<#${guildConfig.byeChannel}>`;
        let joinMsg = guildConfig.welcMsg;
        let byeMsg = guildConfig.byeMsg;
        if(modlogChan === "<#none>"){
          modlogChan = "";
        }if(joinChan === `<#undefined>`){
          joinChan = "";
        }if(byeChan === `<#undefined>`){
          byeChan = "";
        }if(joinMsg === undefined){
          joinMsg = "";
        }if(byeMsg === undefined){
          byeMsg = "";
        }
        const embed = new Discord.RichEmbed()
          .setTitle(`yzbot server configuration for ${msg.guild.name}`)
          .setDescription(`This is yzbot's server configuration for ${msg.guild.name}. If any fields are blank, they have not been set in the database - do ${prefix}help administrator or ${prefix}help config for the commands to configure said settings.`)
          .setColor(`${authorGM.displayHexColor}`)
          .addField(`Prefix`, `\u200B${guildConfig.prefix}`)
          .addField(`Mod Log Channel`, `\u200B${modlogChan}`)
          .addField(`Amount of Mod Logs`, `\u200B${guildConfig.amtmodlogs}`)
          .addField(`Disabled Commands`, `\u200B${guildConfig.disabledCommands.join(", ")}`)
          .addField(`Member Join Message`, `\u200B${joinMsg}`)
          .addField(`Member Leave Message`, `\u200B${byeMsg}`)
          .addField(`Join Message Channel`, `\u200B${joinChan}`)
          .addField(`Leave Message Channel`, `\u200B${byeChan}`)
          .setFooter(`Server ID: ${msg.guild.id}`)
          .setTimestamp()
          msg.channel.send({embed}).catch((e) => {
            msg.channel.send(`An error occured, sorry about that. Please inform yzfire that the following error is occuring, so that he can find out why this is (use ${prefix}invite for the invite to support server):\n${e.message}`);
            logErr(e, "serverconfig (embed)", msg.guild.id);
          })
        }else{
          let modlogChan = `<#${guildConfig.modlog}>`;
          let joinChan = `<#${guildConfig.welcChannel}>`;
          let byeChan = `<#${guildConfig.byeChannel}>`;
          let joinMsg = guildConfig.welcMsg;
          let byeMsg = guildConfig.byeMsg;
          if(modlogChan === "<#none>"){
            modlogChan = ""
          }if(joinChan === `<#undefined>`){
            joinChan = "";
          }if(byeChan === `<#undefined>`){
            byeChan = "";
          }if(joinMsg === undefined){
            joinMsg = "";
          }if(byeMsg === undefined){
            byeMsg = "";
          }
            msg.channel.send(`:warning: **I do not have \`\`EMBED_LINKS\`\` permissions, if you want a better version of this please enable it for yzbot.** :warning:
              \n\n\`\`\`yzbot server configuration for ${msg.guild.name}:
              \n\n\nPrefix: ${guildConfig.prefix}
              \n\nMod Log Channel: ${modlogChan}
              \n\nAmount of Mod Logs: ${guildConfig.amtmodlogs}
              \n\nDisabled Commands: ${guildConfig.disabledCommands.join(", ")}
              \n\nMember Join Message: ${joinMsg}
              \n\nMember Leave Message: ${byeMsg}
              \n\nJoin Message Channel: ${joinChan}
              \n\nLeave Message Channel: ${byeChan}\`\`\``).catch((e) => {
              msg.channel.send(`An error occured, sorry about that. Please inform yzfire that the following error is occuring, so that he can find out why this is (use ${prefix}invite for the invite to support server):\n${e.message}`);
              logErr(e, "serverconfig (non-embed)", msg.guild.id);
            })
        }
    }else{
      return msg.reply(`you require the \`\`MANAGE_SERVER\`\` permission to use this command.`);
    }
  }else if(command === "help"){
    // Internally it's really just fun, moderation, configuration, yzbotrelated, all and information.
    let allowedCategories = ["fun", "moderation", "mod", "config", "admin", "configuration", "yzbotrelated", "information", "info"];
    let cat = args[0];
    if(!cat) return msg.reply(`Usage: \`\`${prefix}help (category)\`\`\nList of available categories:\n${allowedCategories.join(", ")}\n(Some send the same thing, they're just aliases).`);
    let category = cat.toLowerCase();
    if(allowedCategories.includes(category)){
      if(category === "moderation" || category === "mod"){
        logUse("help moderation");
        const embed = new Discord.RichEmbed();
        embed.addField(`Moderation Commands`, `\u200B`);
        for(key in helpJSON.moderation){
          embed.addField(`Command: ${key}`, `\n__**Usage:**__ ${helpJSON.moderation[key].usage}
          \n__**Example:**__ ${helpJSON.moderation[key].example}
          \n__**Description:**__ ${helpJSON.moderation[key].description}`);
          embed.addField(`Yzbot's Required Permission`, `\`\`${helpJSON.moderation[key].permissionyzbot}\`\`\n\u200B`);
        }
        authorGM.send({embed}).then(m => {
          return msg.reply(`information has been sent successfully.`);
        }).catch((e) => {
          logErr(e, "help moderation", msg.guild.id);
          if(e.message === "Cannot send messages to this user"){
            msg.channel.send("I could not send the help requested to your DMs, so I will attempt to send it here.");
            if(yzbotGM.hasPermission("EMBED_LINKS")){
              msg.channel.send({embed}).then(m => {
                return msg.reply(`information has been sent successfully.`);
              }).catch((e) => {
                logErr(e, "help moderation fallback", msg.guild.id);
                return msg.channel.send(`An error,\n\`\`${e.message}\`\`\nhas occurred.`);
              })
            }else{
              return msg.channel.send("I cannot send embeds in this channel.");
            }
          }else{
            return msg.channel.send(`An error,\n\`\`${e.message}\`\`\nhas occurred.`);
          }
        });
      }else if(category === "configuration" || category === "config" || category === "admin"){ // help config
        logUse("help configuration");
        const embed = new Discord.RichEmbed();
        embed.addField(`Configuration Commands`, `All of these commands require the \`\`MANAGE_SERVER\`\` permission to use.`);
        for(key in helpJSON.configuration){
          embed.addField(`Command: ${key}`, `\n__**Usage:**__ ${helpJSON.configuration[key].usage}
          \n__**Example:**__ ${helpJSON.configuration[key].example}
          \n__**Description:**__ ${helpJSON.configuration[key].description}\n\u200B`);
        }
        embed.addField(`The list of commands that can be disabled is:`, `${config.disablableCommands.join(", ")}`);
        authorGM.send({embed}).then(m => {
          return msg.reply(`information has been sent successfully.`);
        }).catch((e) => {
          logErr(e, "help configuration", msg.guild.id);
          if(e.message === "Cannot send messages to this user"){
            msg.channel.send("I could not send the help requested to your DMs, so I will attempt to send it here.");
            if(yzbotGM.hasPermission("EMBED_LINKS")){
              msg.channel.send({embed}).then(m => {
                return msg.reply(`information has been sent successfully.`);
              }).catch((e) => {
                logErr(e, "help configuration fallback", msg.guild.id);
                return msg.channel.send(`An error,\n\`\`${e.message}\`\`\nhas occurred.`);
              })
            }else{
              return msg.channel.send("I cannot send embeds in this channel.");
            }
          }else{
            return msg.channel.send(`An error,\n\`\`${e.message}\`\`\nhas occurred.`);
          }
        });
      }else if(category === "fun"){ // help fun
        logUse("help fun");
        const embed = new Discord.RichEmbed();
        embed.addField(`Fun Commands`, `\u200B`);
        for(key in helpJSON.fun){
          embed.addField(`Command: ${key}`, `\n__**Usage:**__ ${helpJSON.fun[key].usage}
          \n__**Example:**__ ${helpJSON.fun[key].example}
          \n__**Description:**__ ${helpJSON.fun[key].description}\n\u200B`);
        }
        authorGM.send({embed}).then(m => {
          return msg.reply(`information has been sent successfully.`);
        }).catch((e) => {
          logErr(e, "help fun", msg.guild.id);
          if(e.message === "Cannot send messages to this user"){
            msg.channel.send("I could not send the help requested to your DMs, so I will attempt to send it here.");
            if(yzbotGM.hasPermission("EMBED_LINKS")){
              msg.channel.send({embed}).then(m => {
                return msg.reply(`information has been sent successfully.`);
              }).catch((e) => {
                logErr(e, "help fun fallback", msg.guild.id);
                return msg.channel.send(`An error,\n\`\`${e.message}\`\`\nhas occurred.`);
              })
            }else{
              return msg.channel.send("I cannot send embeds in this channel.");
            }
          }else{
            return msg.channel.send(`An error,\n\`\`${e.message}\`\`\nhas occurred.`);
          }
        });
      }else if(category === "information" || category === "info"){
        logUse("help information");
        const embed = new Discord.RichEmbed();
        embed.addField(`Information Commands`, `\u200B`);
        for(key in helpJSON.information){
          if(key === "help"){
            embed.addField(`Command: help`, `\n__**Usage:**__ ${helpJSON.information[key].usage}
            \n__**Example:**__ ${helpJSON.information[key].example}
            \n__**Description:**__ ${helpJSON.information[key].description}
            \n__**Categories:**__ ${helpJSON.information[key].subcommands.join(", ")}`);
          }else if(key === "info"){
            embed.addField(`Command: info`, `\n__**Usage:**__ ${helpJSON.information[key].usage}
            \n__**Example:**__ ${helpJSON.information[key].example}
            \n__**Description:**__ ${helpJSON.information[key].description}
            \n__**Categories:**__ ${helpJSON.information[key].categories.join(", ")}
            \n__More information regarding the different categories is below.__`);
          }
        }
        
        let helpCatInfo = helpJSON.information.info.catParent; // Too much dot notation here!

        for(key in helpCatInfo){
          embed.addField(`\tCommand: info ${key}`, `\n__**Usage:**__ ${helpCatInfo[key].usage}
          \n__**Example:**__ ${helpCatInfo[key].example}
          \n__**Description:**__ ${helpCatInfo[key].description}\n\u200B`);
        }

        authorGM.send({embed}).then(m => {
          return msg.reply(`information has been sent successfully.`);
        }).catch((e) => {
          logErr(e, "help information", msg.guild.id);
          if(e.message === "Cannot send messages to this user"){
            msg.channel.send("I could not send the help requested to your DMs, so I will attempt to send it here.");
            if(yzbotGM.hasPermission("EMBED_LINKS")){
              msg.channel.send({embed}).then(m => {
                return msg.reply(`information has been sent successfully.`);
              }).catch((e) => {
                logErr(e, "help information fallback", msg.guild.id);
                return msg.channel.send(`An error,\n\`\`${e.message}\`\`\nhas occurred.`);
              })
            }else{
              return msg.channel.send("I cannot send embeds in this channel.");
            }
          }else{
            return msg.channel.send(`An error,\n\`\`${e.message}\`\`\nhas occurred.`);
          }
        });
      }else if(category === "yzbotrelated"){
        logUse("help yzbotrelated");
        const embed = new Discord.RichEmbed();
        embed.addField(`Yzbot-Related Commands`, `\u200B`);
        for(key in helpJSON.yzbotrelated){
          embed.addField(`Command: ${key}`, `\n__**Usage:**__ ${helpJSON.yzbotrelated[key].usage}
          \n__**Example:**__ ${helpJSON.yzbotrelated[key].example}
          \n__**Description:**__ ${helpJSON.yzbotrelated[key].description}\n\u200B`);
        }
        authorGM.send({embed}).then(m => {
          return msg.reply(`information has been sent successfully.`);
        }).catch((e) => {
          logErr(e, "help yzbotrelated", msg.guild.id);
          if(e.message === "Cannot send messages to this user"){
            msg.channel.send("I could not send the help requested to your DMs, so I will attempt to send it here.");
            if(yzbotGM.hasPermission("EMBED_LINKS")){
              msg.channel.send({embed}).then(m => {
                return msg.reply(`information has been sent successfully.`);
              }).catch((e) => {
                logErr(e, "help yzbotrelated fallback", msg.guild.id);
                return msg.channel.send(`An error,\n\`\`${e.message}\`\`\nhas occurred.`);
              })
            }else{
              return msg.channel.send("I cannot send embeds in this channel.");
            }
          }else{
            return msg.channel.send(`An error,\n\`\`${e.message}\`\`\nhas occurred.`);
          }
        })
      }
  }else{
      return msg.reply(`that is not a valid category! Type ;help to get a list of categories.`);
  }
}else if(command === "choose"){
    if(guildConfig.disabledCommands.includes("choose")) return msg.reply(`this command has been disabled by an Admin.`);
    let theirOptions = args.join(" ").split("|");
    if(!theirOptions || theirOptions.length < 2) return msg.reply(`you must provide one or more options to choose from, separated with "|"s! (For example: ${prefix}choose One | Two | Three)`);
    let optionsList = theirOptions.map(opt => opt.trim());
    if(optionsList.includes("")) return msg.reply("do not provide blank spaces as options (putting the | separator and then not typing a character).");
    if(optionsList.includes("@everyone") || optionsList.includes("@here")) return msg.reply("you may not choose from those mentions.");
    const m = msg.channel.send("Please wait. Choosing...").then(message => {
      logUse("choose");
      if(yzbotGM.hasPermission("EMBED_LINKS")){
        const embed = new Discord.RichEmbed()
          .setColor("#20dcf9")
          .setTitle(`Yzbot's Choice`)
          .setDescription("Yzbot has made a decision.")
          .addField(`Options Provided`, `\`\`\`${optionsList.join(", ")}\`\`\``)
          .addField(`Choice`, `${theirOptions[Math.floor(Math.random() * theirOptions.length)]}`)
          .setFooter(`Response to ${prefix}choose command executed by ${authorUser.tag}`)
          .setTimestamp()
          const editMsg = () => {
            message.edit({embed});
          }
          setTimeout(editMsg, 1000); 
      }else{
        let timeFormatted = dateFormat(timeNow, "dS mmm, yyyy - h:MM TT"); // Use date format module for easy formatting of dates
        message.edit(`**Yzbot's Choice**
        \n\nYzbot has made a decision.
        \nOptions Provided: \`\`\`${optionsList.join(", ")}\`\`\`
        \nChoice: \`\`\`${theirOptions[Math.floor(Math.random() * theirOptions.length)]}\`\`\`
        \n\nResponse to ${prefix}choose command executed by \`\`${authorUser.tag}\`\` | ${timeFormatted}`);
      }
    });
  }else if(command === "ben"){
    let memb = msg.mentions.members.first();
    let reason = args.slice(1).join(" ");
    if(!memb) return msg.reply(`please specify a member to ben.`);
    if(!reason) reason = "None specified.";
    if(memb.id === devId) return msg.reply(`you cannot ben my owner.`);
    logUse("ben");
    msg.reply(`user <@${memb.id}> was benned successfully.`);
    const embed = new Discord.RichEmbed()
      .setColor("#ff0000")
      .setTitle(`You were benned (fake-banned) in server ${msg.guild.name}`)
      .addField(`You were benned by ${authorUser.tag} for the reason`, `${reason}`)
      .setTimestamp()
      memb.send(embed).catch((e) => {
        if(e.message === "Cannot send messages to this user"){
          msg.channel.send(`I am unable to send a direct message to this user informing them about their ben.`);
          logErr(e, "ben", msg.guild.id);
        }else{
          msg.channel.send(`An error occured, sorry about that. Please inform yzfire that the following error is occuring, so that he can find out why this is (use ${prefix}invite for the invite to support server):\n${e.message}`);
          logErr(e, "ben", msg.guild.id);        
        }
      });
  }else if(command === "uptime"){
    if(guildConfig.disabledCommands.includes("uptime")) return msg.reply(`this command has been disabled by an Admin.`);
    logUse("uptime");
    let timeStarted = moment(client.readyAt);
    let currTime = moment(new Date());
    let currUptime = moment.preciseDiff(timeStarted, currTime);
    msg.reply(`I have been online for ${currUptime}.`);
  }else if(command === "quote"){
    if(guildConfig.disabledCommands.includes("quote")) return msg.reply(`this command has been disabled by an Admin.`);
    let msgID = args[0];
    if(!msgID) return msg.reply(`please provide a message ID to quote.`);
    if(msgID.length !== 18 || isNaN(msgID)) return msg.reply(`please provide a valid message ID to quote.`);
    logUse("quote");
    msg.channel.fetchMessage(msgID).then(m => {
      if(yzbotGM.hasPermission("EMBED_LINKS") || yzbotGM.hasPermission("ADMINISTRATOR")){
        const embed = new Discord.RichEmbed();
        embed.setColor('GREEN');
        embed.setAuthor(m.author.tag, m.author.displayAvatarURL);
        embed.setDescription(m.content);
        embed.setFooter(`Quoted from ${m.author.tag}`);
        msg.channel.send({embed}).catch((e) => {
          logErr(e, "quote", msg.guild.id);
            return msg.channel.send(`An error has occurred.\n\`\`${e.message}\`\``);
        });
      }else{
        return msg.reply(`I cannot send embeds in this channel. Please give me the \`\`EMBED_LINKS\`\` permission to use this command.`);
      }
    }).catch((e) => {
      logErr(e, "quote", msg.guild.id);
      if(e.message === "Unknown Message"){
        return msg.reply(`that message does not exist, or it does not come from this channel.`);
      }else{
        return msg.channel.send(`An error has occurred.\n\`\`${e.message}\`\``);
      }
    });
  }else if(command === "support"){
    // const contactBlacklistData = new EnmapLevel({name: "contactBlacklist"});
    // client.contactBlacklist = new Enmap({provider: contactBlacklistData});
    let opt = args[0];
    let allowedOpts = ['gethelp', 'reply', 'blacklist', 'unblacklist'];
    if(allowedOpts.includes(opt)){
      if(opt === "gethelp"){ // ;support gethelp hi
        if(client.contactBlacklist.get(msg.author.id)) return msg.reply(`you have been blacklisted from using the contact command.`);
        if(msg.guild.id === "425030567457980417") return msg.reply(`as you are here anyway, go to <#427233261853343755> to receive support directly.`);
        let prob = args.slice(1).join(" ");
        if(!prob) return msg.reply(`please provide your problem.`);
        if(prob === "help" || prob === "help me") return msg.reply(`be more specific.`);
        logUse("support gethelp");
        msg.reply(`contacted successfully.`);
        const embed = new Discord.RichEmbed();
        embed.setTitle(`Contact Request Made`);
        embed.addField(`User`, `${msg.author.id} (${msg.author.tag}, <@${msg.author.id}>)`);
        embed.addField(`Server`, `${msg.guild.id} (${msg.guild.name})`);
        embed.addField(`Channel`, `${msg.channel.id}`);
        embed.addField(`Problem`, `${prob}`);
        embed.setColor("RED");
        embed.setFooter("Contact Log");
        embed.setTimestamp();
        client.channels.get("429380324032643102").send({embed});
      }else if(opt === "reply"){
        if(msg.guild.id !== "425030567457980417") return;
        if(!authorGM.roles.some(r=>["Support", "Developer"].includes(r.name))) return; // needs to be support, or dev
        let chanID = args[1]; // ;support reply (IDTOREPLY). In args this'd be [reply, (IDTOREPLY)]...
        if(chanID.length !== 18 || isNaN(chanID)) return msg.reply(`please provide a valid channel ID.`);
        let response = args.slice(2).join(" "); // The rest of the array.
        if(!response) return msg.reply(`please provide a response.`);
        if(client.channels.get(chanID)){
          let title;
          if(authorGM.roles.some(r =>["Support"].includes(r.name))) title = "Support Team Member";
          if(authorGM.id === devId) title = "Developer";
          client.channels.get(chanID).send(`**${title}** ${authorUser.tag} has responded to your request regarding yzbot:\n\`\`\`${response}\`\`\``);
          msg.reply(`replied successfully.`);
        }else{
          return msg.reply(`no such channel exists.`);
        }
      }else if(opt === "blacklist"){
        if(msg.author.id !== devId) return;
        let id = args[1];
        let reas = args.slice(2).join(" ");
        if(!reas) reas = "None specified.";
        // Basic checks to check if the ID is in the valid syntax of a Discord ID.
        if(!id) return msg.reply(`please provide an ID to blacklist from the support command.`);
        if(id.length !== 18 || isNaN(id)) return msg.reply(`please provide a valid ID to blacklist from the support command.`);
        let reasonObject = {
          reason: reas
        }
        logUse("support blacklist");
        client.contactBlacklist.set(id, reasonObject);
        msg.reply(`user with the ID of ${id} has been blacklisted from using the contact command successfully.`);
        const embed = new Discord.RichEmbed();
        embed.setTitle(`Contact Command Blacklist Log`);
        embed.addField(`User`, `<@${id}> (ID: ${id})`);
        embed.addField(`Blacklisted by`, `<@${devId}> (yzfire)`);
        embed.addField(`Reason`, `${reas}`);
        embed.setFooter(`Blacklist Addition Log - yzbot`);
        embed.setTimestamp();
        client.channels.get("429380324032643102").send({embed});
      }else if(opt === "unblacklist"){
        if(msg.author.id !== devId) return;
        let id = args[1]; 
        let reason = args.slice(2).join(" ");
        if(!reason) reason = "None specified.";
        // Basic checks to check if the ID is in the valid syntax of a Discord ID.
        if(!id) return msg.reply(`please provide an ID to blacklist from the support command.`);
        if(id.length !== 18 || isNaN(id)) return msg.reply(`please provide a valid ID to blacklist from the support command.`);
        if(!client.contactBlacklist.get(id)) return msg.reply(`this user is not blacklisted.`);
        logUse("support unblacklist");
        client.contactBlacklist.delete(id);
        msg.reply(`user unblacklisted successfully.`);
        const embed = new Discord.RichEmbed();
        embed.setTitle(`Contact Command Unblacklist Log`);
        embed.addField(`User`, `<@${id}> (ID: ${id})`);
        embed.addField(`Unblacklisted by`, `<@${devId}> (yzfire)`);
        embed.addField(`Reason`, `${reason}`);
        embed.setFooter(`Unblacklist Log - yzbot`);
        embed.setTimestamp();
        client.channels.get("429380324032643102").send({embed});
      }
    }else{
      return msg.reply(`that is not a valid option. If you want to get help type ${prefix}support gethelp (Problem here)`);
    }
  }else if(command === "membjoinleave"){ // Example usage: ;membjoinleave join message Welcome, <USER> to <SERVERNAME>!
    if(authorGM.hasPermission("MANAGE_SERVER") || authorGM.hasPermission("ADMINISTRATOR")){
      let opt = args[0];
      let allowedOpts = ["join", "leave"];
      if(allowedOpts.includes(opt)){
        if(opt === "join"){
          let subOpt = args[1];
          let allowedSubOpts = ["message", "channel"];
          if(allowedSubOpts.includes(subOpt)){
            if(subOpt === "message"){
              let message = args.slice(2).join(" ");
              if(!message) return msg.reply(`please provide a message to set.`);
              guildConfig.welcMsg = message;
              client.guildSettings.set(msg.guild.id, guildConfig);
              return msg.reply(`welcome message has been set as the following successfully:\n\`\`\`${message}\`\`\``);
            }else if(subOpt === "channel"){
              let chan = msg.mentions.channels.first();
              if(!chan) return msg.reply(`please mention a channel to set as the channel for member join messages, for example: #welcome-goodbye.`);
              let chanID = chan.id;
              if(!msg.guild.channels.some(c => c.id === chanID)) return msg.reply(`that channel is not in this server - you may not set your join message channel to one outside of it.`);
              guildConfig.welcChan = chanID;
              client.guildSettings.set(msg.guild.id, guildConfig);
              return msg.reply(`join message channel set to <#${chanID}> successfully.`);
            }
          }else{
            return msg.reply(`that's not a valid sub-option. List of valid sub-options:\n${allowedSubOpts.join(", ")}`);
          }
        }else if(opt === "leave"){
          let subOpt = args[1];
          let allowedSubOpts = ["message", "channel"];
          if(allowedSubOpts.includes(subOpt)){
            if(subOpt === "message"){
              let message = args.slice(2).join(" ");
              if(!message) return msg.reply(`please provide a message to set.`);
              guildConfig.leaveMsg = message;
              client.guildSettings.set(msg.guild.id, guildConfig);
              return msg.reply(`leave message has been set as the following successfully:\n\`\`\`${message}\`\`\``);
            }else if(subOpt === "channel"){
              let chan = msg.mentions.channels.first();
              if(!chan) return msg.reply(`please mention a channel to set as the channel for member leave messages, for example: #welcome-goodbye.`);
              let chanID = chan.id;
              if(!msg.guild.channels.some(c => c.id === chanID)) return msg.reply(`that channel is not in this server - you may not set your leave message channel to one outside of it.`);
              guildConfig.leaveChan = chanID;
              client.guildSettings.set(msg.guild.id, guildConfig);
              return msg.reply(`leave message channel set to <#${chanID}> successfully.`);
            }
          }else{
            return msg.reply(`that's not a valid sub-option. List of valid sub-options:\n${allowedSubOpts.join(", ")}`);
          }
        }
      }else{
        return msg.reply(`that's not a valid option. List of valid options:\n${allowedOpts.join(" ")}`);
      }
    }
  }else if(command === "invite"){
    client.generateInvite(403041430).then(l => {
      msg.channel.send(`**Invite yzbot to your server:** ${l}\n**Support Server**: *Coming Soon*`).catch((e) => {
        logErr(e, "invite", msg.guild.id);
      });
    });
  }else if(command === "prune"){
    if(msg.guild.id !== "260538516285423616") return; // If guild isn't Corrupt X Community Chat return.
    if(authorGM.hasPermission("KICK_MEMBERS") || authorGM.hasPermission("ADMINISTRATOR")){ // Do they have kick members? Do they have administrator perms?
      msg.guild.pruneMembers(7).then(amount => { // Let the prune commence! 7-day prune.
        const embed = new Discord.RichEmbed()
          .setColor("GREEN")
          .setTitle(`${amount} members have been pruned.`)
          .addField(`Staff Member`,  `${authorUser.tag}`)
          .setFooter("Corrupt X Community Chat Prune Log")
          .setTimestamp()
          client.channels.get("289342034030886912").send({embed}).catch((e) => { // Send the embed at #mod-log
            msg.channel.send(`An error occured.\n\`\`${e.message}\`\`\nThis shouldn't be happening, get here, <@${devId}>.`);
            logErr(e, "prune", msg.guild.id);
          });
          msg.reply(`pruned ${amount} members successfully! (7-day prune).`); 
      });
    }
  }else if(command === "norolesamount"){
    if(msg.guild.id !== "260538516285423616") return;
    if(authorGM.hasPermission("KICK_MEMBERS") || authorGM.hasPermission("ADMINISTRATOR")){
      let norolescollection = msg.guild.members.filter(m => m.roles.size === 1);
      msg.reply(`${norolescollection.size} members have no role (except @ everyone).`);
    }
  }else if(command === "promote"){
    if(msg.guild.id !== "396799859900022784") return;
    if(authorGM.roles.some(r=>["Moderator", "Head Moderator", "Administrator", "Head Administrator", "Staff", "Owner"].includes(r.name))){
      let rawOptions = args.join(" ").split("|");
      let theirOptions = rawOptions.map(opt=>opt.trim());
      let memb = msg.mentions.members.first();
      let roleAsked = theirOptions[1];
      let reason = theirOptions[2];
      if(!memb) return msg.reply(`please provide a member.`);
      const promotableRoles = ["Link Manager", "Trial Moderator", "Moderator", "Head Moderator", "Administrator"];
      if(!promotableRoles.includes(roleAsked)) return msg.reply(`please provide a valid role to promote the member to. (Can be one of: ${promotableRoles.join(", ")})`);
      if(!reason) reason = "None specified.";
      let roleObj = msg.guild.roles.find("name", roleAsked);
      const staffRole = msg.guild.roles.find("name", "Staff");
      let rolePosition = roleObj.position; // Position of the role we wish to promote to.
      let authPosition = authorGM.highestRole.position; // Position of the message author's highest role.
      if(rolePosition >= authPosition && msg.author.id !== msg.guild.ownerID) return msg.reply(`you cannot promote members to a higher than or equal role than you.`);
      const currentNick = memb.nickname;

      const isStaff = (aMemb) => {
        if(aMemb.roles.some(r=>["Staff"].includes(r.name))){
          return true;
        }else{
          return false;
        }
      }
      function nonStaffPromote(rank){
        memb.addRole(roleObj, `Promoted by ${authorUser.tag} using yzbot.`);
        client.channels.get("397038479202189312").send({embed});
        return msg.reply(`promoted <@${memb.id}> to **${roleAsked}** successfully.`);
      }

      function staffPromote(rank){
        if(rank === "Moderator" || rank === "Head Moderator"){ // Check cases if they are some kind of Mod.
          memb.setNickname(`(symbol) ${currentNick}`);
        }else if(rank === "Administrator"){ // Admin.
          memb.setNickname(`(symbol) ${currentNick}`);
        } // (No one is being promoted to Head-Admin or Owner!)
        if(!isStaff(memb)){ // Not staff.
          memb.addRoles([roleObj, staffRole], `Promoted by ${authorUser.tag} using yzbot.`);
          client.channels.get("397038479202189312").send({embed});
          return msg.reply(`promoted <@${memb.id}> to **${roleAsked}** successfully.`);
        }else{ // Already staff.
          memb.addRole(roleObj, `Promoted by ${authorUser.tag} using yzbot.`);
          client.channels.get("397038479202189312").send({embed});
          return msg.reply(`promoted <@${memb.id}> to **${roleAsked}** successfully.`);
        }
      }

      if(memb.roles.some(r=>[roleAsked].includes(r.name))) return msg.reply(`that member already has that role.`);
      const embed = new Discord.RichEmbed()
      embed.setTitle(`${memb.user.tag} was promoted!`)
      embed.setDescription(`Congratulations, ${memb.user.tag}, on the promotion!`)
      embed.addField(`Promoted to`, `${roleAsked}`, true)
      embed.addField(`Promoted by`, `${msg.author.tag} (<@${msg.author.id}>)`, true)
      embed.addField(`Reason`, `${reason}`)
      embed.setFooter(`Promotion log from yzbot`)
      embed.setTimestamp()
      if(roleAsked === "Link Manager"){
        nonStaffPromote("Link Manager"); // Still need to pass in the value - it's expecting it.
      }else if(roleAsked === "Trial Moderator"){
        nonStaffPromote("Trial Moderator");
      }else if(roleAsked === "Moderator"){
        staffPromote("Moderator");
      }else if(roleAsked === "Head Moderator"){
        staffPromote("Head Moderator");
      }else if(roleAsked === "Administrator"){
        staffPromote("Administrator");
      }
    }else{
      return msg.reply(`you cannot promote members of this server.`);
    }
  }
});

client.login(token);