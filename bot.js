// Main variables at the top of the program.
const Discord = require("discord.js");
const client = new Discord.Client();
const prefix = ".";
const token = "the bot's token";

client.on("ready", () => {
	console.log(`Logged in as ${client.user.tag}`);
	client.user.setActivity(`.help | In ${client.guilds.size} servers | Now with optional arguments for .avatar and .userinfo!`);
	client.user.setStatus("dnd");
});

let devId = "267670678050832384";
let logsId = "422008663042031616";
let generalChatId = "396799861267103774";
let punishmentLogs = "397038370347286528";

function clean(text) {
  if (typeof(text) === "string")
    return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
  else
      return text;
}

const getUptime = () => {
	//let dateObject = new Date();
	//let timenow = dateObject.valueOf();
	let currentUptime = client.uptime;

}

client.on("message", msg => { // This function is called if a message is sent
	//if(!msg.guild.available) return;
	let guildMember = msg.member; // I should have used this from the start, it offers lots more in terms of functionalitiy, but I don't want to rewrite a lot of code.
	let u = msg.author; // This variable represents the message's author.
	if(u.bot) return;
	if(!msg.content.startsWith(prefix)) return;
	const args = msg.content.slice(prefix.length).trim().split(/ +/g); // Removes prefix, deletes whitespace, splits the command into an array where we have the command and anything that the user delimits with a space.
  const command = args.shift().toLowerCase(); // Remove the command from the args variable and store it here instead, make it lowercase to avoid case-sensitivity issues
	//if(msg.system) return;
	if(command === "userinfo"){ // userinfo command
			// display the user's info
		let member = msg.mentions.members.first();
		if(!member){
			let status = u.presence.status;
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
			const embed = new Discord.RichEmbed()
				.setTitle(`User info for ${u.tag}`)
				.setThumbnail(`${u.avatarURL}`)
				.addField("ID:", `${guildMember.id}`)
				.addField("Account Created:", `${u.createdAt}`)
				.addField("Avatar URL:", `${u.avatarURL}`)
				.addField("Highest Role", `${guildMember.highestRole}`)
				.addField("Join Date", `${guildMember.joinedAt}`)
				.addField("Status:", `${status}`)
				.setTimestamp()
				msg.channel.send({embed});
			console.log(`.userinfo was executed by ${u.username}`)
	}else{
		let userObject = member.user; // Represents the member object as an instance of the User class, and not GuildMember
		let status = userObject.presence.status;
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
		const embed = new Discord.RichEmbed()
			.setTitle(`User info for ${userObject.tag}`)
			.setThumbnail(`${userObject.avatarURL}`)
			.addField("ID:", `${userObject.id}`)
			.addField("Account Created:", `${userObject.createdAt}`)
			.addField("Avatar URL:", `${userObject.avatarURL}`)
			.addField("Highest Role:", `${member.highestRole}`)
			.addField("Join Date:", `${member.joinedAt}`)
			.addField("Status", `${status}`)
			msg.channel.send({embed});
	}
	}else if(command === "devonlycmd"){ // devonlycmd cmd
		if(u.id !== devId){ // if the id isn't mine
			msg.channel.send("Hey succ yzfire's long ducc like succ, you narb."); // send HATE
			console.log(`.devonlycmd was executed by ${u.username}, who wasn't yzfire`)
		}else{
			msg.channel.send("owo hi you're my saviour"); // else send LOVE
			console.log(`.devonlycmd was executed by ${u.username}`)
		}
	}else if(command === "help"){ // Help command
		msg.reply("help has been sent to your DMs! | :outbox_tray:");
		const thumbnailURL = "http://logosrated.net/wp-content/uploads/parser/INFORMATION-VECTOR-SIGN-Logo-1.gif";
		const authorImgURL = "https://cdn.discordapp.com/avatars/418827411350618122/0323f8a524893b46046dd25d64ec91f1.png"
		const embed = new Discord.RichEmbed()
			.setAuthor("yzbot", authorImgURL) // Sets the author of the embed as yzbot and puts the image url constant as the image.
			.setColor("#5532f1")
			.setTitle("yzbot help and info:")
			.setThumbnail(thumbnailURL)
			.setDescription("yzbot is a bot made by yzfire#6822. This bot is in heavy development, and I'm not the best developer, so don't expect big changes and many, useful features quickly. If you need any extra info about the bot, please contact yzfire#6822. Thank you.")
			.addField(".help", "Sends help and information about the bot to the user's DMs.", true)
			.addField(".userinfo (optional mention)", "Sends information about the user mentioned to the current channel, or your own if you left out the mention.", true)
			.addField(".lenny", "Sends a lenny face to the current channel.", true)
			.addField(".narbrating", "Your narb rating. This changes every time you run the command.", true)
			.addField(".ban (mention) (reason)", "Bans the user mentioned from the server (requires 'BAN_MEMBERS' permission).", true)
			.addField(".avatar (optional mention)", "Shows the avatar of the mentioned user, or your avatar if you left out the mention.", true)
			.addField(".serverinfo", "Prints information about the server that you sent the command in.", true)
			.addBlankField()
			.addField("In Development", "These commands are in development and you will most likely get an error if you try to use them.", true)
			.addField(".ping", "Returns the bot response time.", true)
			.addField(".addrole (member) (role) (any order)", "Adds the role specified to the user mentioned.", true)
			.addField(".hackban (id) (reason)", "Bans the member corresponding to the ID provided, for the reason specified.", true)
			.addBlankField()
			.addField("Dev-Only", "These commands are dev-only. Don't try to use them!", true)
			.addField(".devonlycmd", "Type this command in and you get trolled. Unless you're yzfire, of course.", true)
			.addField(".shutdown", "This command will shut down the bot.")
			.addField(".say", "This command will make the bot say something.")
			.addField(".eval", "Evaluates some JavaScript code and prints a result.")
			.setTimestamp()
			u.send({embed});
		console.log(`.help was executed by ${u.username}`)
	}else if(command === "lenny"){ // Lenny command
		msg.channel.send("( ͡° ͜ʖ ͡°)");
		console.log(`.lenny was executed by ${u.username}`)
	}else if(command === "narbrating"){ // Narbrating command
		if(u.id == devId){ // if the person who executed it is me,
			msg.reply("your narb rating is 0 out of 100, and it always will be, because you're yzfire, damnit!");
			console.log(`.narbrating was executed by ${u.username}`)
		}else if(u.id == "335591511045439490"){ // else if it's Tahs0,
			msg.reply("your narb rating is 100 out of 100. It always will be, you cancerous narb.");
			console.log(`.narbrating was executed by ${u.username}`)
		}else{ // else if it's someone else
			let rating = Math.ceil(Math.random() * 100);
			msg.reply(`your narb rating is ${rating} out of 100.`);
			console.log(`.narbrating was executed by ${u.username}`)
		}
	}else if(command === "ping"){ // Ping command
		//const m = await msg.channel.send("Pong!");
    //m.edit(`The ping is: ${m.createdTimestamp - msg.createdTimestamp}ms`);
		msg.channel.send("This command is in maintenance. Please try again later.");
		console.log(`.ping was executed by ${u.username}`);
	}else if(command === "shutdown"){
		if(u.id !== devId){
			let thumbnail = "https://cdn.discordapp.com/attachments/397038645095432193/422063977061810178/1f6ab.png";
			const firstEmbed = new Discord.RichEmbed()
				.setThumbnail(thumbnail)
				.setTitle("Bot Shutdown Failed")
				.setDescription(`Don't try to shut the bot down, ${u.username}#${u.discriminator}!`)
				.setTimestamp()
				msg.channel.send({firstEmbed});
			const embed = new Discord.RichEmbed()
				.setThumbnail(thumbnail)
				.setTitle("Attempted Shutdown (Failed):")
				.addField("User", `${u.username}#${u.discriminator}`)
				.addField("Server:", `${msg.guild.name}`)
				.addField("Channel:", `${msg.channel.name}`)
				.setTimestamp()
				client.channels.get(logsId).send({embed});
				client.channels.get(logsId).send(`<@${devId}>, someone attempted to shut your bot down. Deal with them.`);
		}else{
			msg.channel.send("Bot shutting down in 3 seconds...");
			const embed = new Discord.RichEmbed()
				.setTitle("Bot Shutdown:")
				.addField("User", `${u.username}#${u.discriminator}`)
				.addField("Server:", `${msg.guild.name}`)
				.addField("Channel:", `${msg.channel.name}`)
				.setTimestamp()
				client.channels.get(logsId).send({embed})
			setTimeout(process.exit, 3000); // Shutdown the bot in 3 seconds.
		}
	}else if(command === "avatar"){
		let member = msg.mentions.members.first(); // GuildMember class object
		if(!member){
		let embed = new Discord.RichEmbed()
			.setTitle(`Avatar of ${u.username}#${u.discriminator}`)
			.setImage(`${u.avatarURL}`)
			.setFooter(`ID: ${guildMember.id}`)
			.setTimestamp()
			msg.channel.send({embed});
		}else{
			let userObject = member.user;
			const embed = new Discord.RichEmbed()
				.setTitle(`Avatar of ${userObject.username}#${userObject.discriminator}`)
				.setImage(`${userObject.avatarURL}`)
				.setFooter(`ID: ${userObject.id}`)
				.setTimestamp()
				msg.channel.send({embed});
			console.log(`.avatar was executed by ${u.username}`);
		}
	}else if(command === "ban"){
		if (msg.member.hasPermission('BAN_MEMBERS')){ // If the member can ban people,
			let reason = args.slice(1).join(' ');
			let member = msg.mentions.members.first();
  		if(!member){ // if member not specified
    		return msg.reply("please mention a valid member of this server!");
			}else if(!member.bannable){ // if we cant ban this person
	    		return msg.reply("the specified user has a higher or equal role hierarchy position than one or both of us!");
			}else if(!reason){ // if reason unspecified
	    		return msg.reply("please provide a reason!");
				}else{
					const firstEmbed = new Discord.RichEmbed()
						.setTitle(`You were banned in ${msg.guild.name}`)
						.addField("Ban Reason", `${reason}`)
						.addField("Moderator", `${msg.author}`)
						.setTimestamp()
						.setFooter("Ban log from yzbot")
						member.send(firstEmbed) // For some reason passing it in with {} gives an error. Don't do that.
					function banMemb(){
						member.ban(reason + ` | Banned by user ${msg.author.tag} using yzbot`);
					}
					setTimeout(banMemb, 1500);

					msg.reply(`user ${member} banned successfully.`);
					let embed = new Discord.RichEmbed()
						.setTitle("yzbot banned a member")
						.addField("User Banned:", `${member}`)
						.addField("Moderator:", `${msg.author}`)
						.addField("Reason:", `${reason}`)
						.setTimestamp()
						.setFooter("Ban log from yzbot")
						client.channels.get(punishmentLogs).send({embed}); // Send the embed in #punishment-logs
				}
		}else{ // If the member can't ban people
			return msg.reply("you do not have the `BAN_MEMBERS` permission.");
		}
	}else if(command === "hackban"){
		if(u.id !== devId) return;
		let id = args[0];
		let reason = args.slice(1).join(' ');

		if(msg.member.hasPermission("BAN_MEMBERS")){
			if(!id || id.length !== 18){
				return msg.reply("please specify a valid user ID!")
			}else if(!reason){
				return msg.reply("please provide a reason!");
			}else{
				member.ban(reason + ` | Banned by user ${msg.author.tag} using yzbot`);
				msg.reply(`user with ID ${id} (<@${id}>) banned successfully!`);
			}
		}else{
			return msg.reply("you do not have the `BAN_MEMBERS` permission.");
		}
	}
	else if(command === "say"){
		if(u.id !== devId) return;
		let message = args.join(" ").toString()
		msg.channel.send(message);
		msg.delete();
	}else if(command === "serverinfo"){
		if(!msg.guild.available) return;
		let guild = msg.guild;
		let rolesArr = guild.roles.array();
		let highestRole = rolesArr[0];
		let verification_level;
		switch(guild.verificationLevel){
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
		const embed = new Discord.RichEmbed()
			.setTitle(`Information about the server ${guild.name}`) // Works
			.setThumbnail(`${guild.iconURL}`) // Works
			.addField("Members:", `${guild.members.size}`) // Works
			.addField("Owner:", `${guild.owner.toString()}`) // Works
			.addField("Region:", `${guild.region}`) // Works
			.addField("Number of roles:", `${guild.roles.size}`) // Works
			//.addField("Highest Role", `${highestRole}`) // Does NOT work
			.addField("Created:", `${guild.createdAt}`) // Works
			.addField("Verification Level:", `${verification_level}`) // Works
			.setTimestamp() // works
			.setFooter(`Server information requested by ${u.username}#${u.discriminator}`) // works
			msg.channel.send({embed});
	}else if(command === "eval"){
		if(u.id !== devId) return;
		try {
      const code = args.join(" ");
      let evaled = eval(code);

      if (typeof evaled !== "string")
        evaled = require("util").inspect(evaled);
      msg.channel.send(clean(evaled), {code:"xl"});
    } catch (err) {
      msg.channel.send(`\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``);
    }

	}

	else if(command === "addrole"){
		if(u.id !== devId) return;
	  let member = msg.mentions.members.first();
		let roleToAdd = args[1].toString(); // the third thing in the command (.addrole @yzfire (ROLE HERE))
	}else if(command === "botinfo"){
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
		const embed = new Discord.RichEmbed()
			.setTitle("Information about yzbot")
			.setThumbnail(`${client.user.avatarURL}`)
			.setDescription("yzbot is a bot made by yzfire#6822. This bot is in heavy development, and I'm not the best developer, so don't expect big changes and many, useful features quickly. If you need any extra info about the bot, please contact yzfire#6822. Thank you.")
			.addField("Developer:", `yzfire#6822 (<@${devId}>)`)
			.addField("Online Since:", `${client.readyAt}`, true)
			.addField("ID:", `${client.user.id}`)
			.addField("Status:", `${status}`, true)
			.addField("Servers:", `${client.guilds.size}`)
			.addField("Channels:", `${client.channels.size}`, true)
			.addField("Created on:", `${client.user.createdAt}`)
			.setFooter(`yzbot information (requested by ${u.username}#${u.discriminator})`)
			.setTimestamp()
			//.addField("Members", `${client.guilds.members.size}`)
			msg.channel.send({embed})
	}else if(command === "setbotnick"){
		if(u.id!==devId) return;
		let yzbot = msg.guild.members.find("id", "418827411350618122")
		if(yzbot.hasPermission("CHANGE_NICKNAME")){
			let nickname = args.join(" ");
			if(nickname.length < 32){
				yzbot.setNickname(nickname, ".setbotnick command executed by yzfire");
				msg.reply(`bot nickname was changed to **${nickname}** successfully!`);
			}else{
				msg.reply(`the length of the nickname entered is longer than 32 characters! (${nickname.length} characters entered)`)
			}
		}else{
			msg.reply("I do not have the ``CHANGE_NICKNAME`` permission!");
	}
	}
});

client.on("guildBanAdd", (guild, user) => {
	if(!guild.available) return;
	else{
		client.channels.get(generalChatId).send(`${user.username.toString()} didn't leave, but got banned, from ${guild.name}. Good riddance, ${user.username.toString()}.`);
		console.log(`A ban was added to ${user.username.toString()} in ${guild.name}`);
		let thumbnailURL = "https://cdn.discordapp.com/attachments/397029145613172736/422036219220983818/397497336907169792.png";
		let embed = new Discord.RichEmbed()
			.setTitle("Ban Log:")
			.setThumbnail(thumbnailURL)
			.addField("User Banned", `${user.username}#${user.discriminator}`)
			.addField("Server:", `${guild.name}`)
			.setTimestamp()
			client.channels.get(logsId).send({embed});
	}
});

client.on("guildBanRemove", (guild, user) => {
	if(!guild.available) return;
	else{
		console.log(`A ban was removed from ${user.username.toString()}`);
		let thumbnailURL = "";
		let embed = new Discord.RichEmbed()
			.setTitle("Unban Log:")
			.setThumbnail(thumbnailURL)
			.addField("User Unbanned", `${user.username}#${user.discriminator}`)
			.addField("Server:", `${guild.name}`)
			.setTimestamp()
			client.channels.get(logsId).send({embed});
	}
});

client.on("guildMemberAdd", member => {
	const embed = new Discord.RichEmbed()
			.setTitle("Join Log:")
			//.setThumbnail(thumbnailURL)
			.addField("User", `<@${member.id}>`)
			.addField("Server:", `${member.	guild.name}`)
			.setTimestamp()
			client.channels.get(logsId).send({embed});
});

client.on("guildCreate", guild => {
	client.user.setActivity(`.help | In ${client.guilds.size} servers | Now with optional arguments for .avatar and .userinfo!`);
});

client.on("guildDelete", guild => {
	client.user.setActivity(`.help | In ${client.guilds.size} servers | Now with optional arguments for .avatar and .userinfo!`);
});

client.login(token);
