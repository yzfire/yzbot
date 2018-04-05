module.exports.run = (client, msg, args) => {
  const m = msg.channel.send('Pong!...').then(message => {
      message.edit(`:ping_pong: Pong! The ping is currently: **${message.createdTimestamp-msg.createdTimestamp}ms**`);
  });
}