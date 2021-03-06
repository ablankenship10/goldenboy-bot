// Ideas:
// Punish/Reward
// Harass User
// Kill
// random interjections
// dms/secrets
// worthless trivia
// likes: gold, cookies, full communism, chicken dinners, approval, la croix, gifs, politeness(needs please randomly)
// dislikes: microsoft, nazis, aaron blankenship, boredom, loneliness, brb, weird
// swear jar
// vote
// respond to name mention
// sleep, silence, awake

console.log('process.env.NODE_ENV', process.env.NODE_ENV); // eslint-disable-line no-console
if (process.env.NODE_ENV === 'development') {
  require('dotenv').config();
}

const bot = require('./src/bot');
const server = require('./web/server-web');
const {trelloCommands, togglCommands, noteCommands, helpCommands, statusCommands, funCommands, allCommands, swearCommands, githubCommands} = require('./src/commands');
const {funPrewords, statusPrewords, allPrewords} = require('./src/prewords');
const {updateUsers, getUsernameFromId} = require('./src/users');
const {updateChannels, getChannelFromId, updateIMs, getIMfromUID} = require('./src/channels');
const {updateMeetingNotes, getCardListFromCommand, updateTrello} = require('./src/trello');
const {togglReport} = require('./src/toggl');
const {createGoldenboyIssue} = require('./src/github');
const {hates, expressHatred} = require('./src/hates');
const {loves, expressLove} = require('./src/loves');
const {incrementUserSwearCount} = require('./src/rethinkdb_gb');
const {robotName, traits, changeStatus, haveFunPreword, checkSwears} = require('./src/gb-status');
const {swears} = require('./src/swears');


function giveHelp(command, message) {
  switch (command) {
    case "hello:":
      bot.sendMessage(message.channel, "Hello! :)");
      break;
    case "help:":
      let allCommandsMessage = "I am Golden Boy! Here are all the things you can tell me to do. \n";
      allCommandsMessage += allCommands.reduce((a, b) => a + '\n' + b);
      message_location = getIMfromUID(message.user)
      console.log(message_location)
      bot.sendMessage(message_location, allCommandsMessage);
      break;
  }
}

bot.use(function(message, cb) {

  //console.log(Object.getOwnPropertyNames(message));


  const multipleCommandFlag = false; // to be implemented
  if (message.type === 'message' && message.text) {
    const lc_message = message.text.toLowerCase();
    const userName = getUsernameFromId(message.user);

    console.log(userName + ' said: ' + message.text);
    if (userName !== robotName) {
      let swearCount = 0;

      swears.forEach(function(swear) {
        const swear_check = swear.exec(lc_message);
        if (swear_check) {
          console.log("detected swear");
          swearCount = swearCount + 1;
        }
        const username_swear_check = swear.exec(userName);
        if (traits.usernameSwears && username_swear_check) {
          console.log("detected swear");
          swearCount = swearCount + 1;
        }
      });

      if (swearCount) {
        incrementUserSwearCount(message.user, swearCount).then((res) => {
          bot.sendMessage(message.channel, "Woah! +" + swearCount + " to the swear jar for " + userName + " :poop: :skull:");
        });
      }

      // check for hates
      hates.forEach(function(hate) {
        if (~lc_message.indexOf(hate)) {
          const hate_minus_s = (hate.endsWith("s") ? hate.substring(0, hate.length - 1) : hate);
          const hate_minus_apostraphe = (hate_minus_s.endsWith("\'") ? hate_minus_s.substring(0, hate_minus_s.length - 1) : hate_minus_s)
          expressHatred(hate_minus_apostraphe, message);
        }
      });

      // check for loves
      loves.forEach(function(love) {
        if (~lc_message.indexOf(love)) {
          const love_minus_s = (love.endsWith("s") ? love.substring(0, love.length - 1) : love);
          const love_minus_apostrophe = (love_minus_s.endsWith("\'") ? love_minus_s.substring(0, love_minus_s.length - 1) : love_minus_s)
          expressLove(love_minus_apostrophe, message);
        }
      });


      if (~message.text.indexOf(robotName) || ~message.text.indexOf('<@U42RZ5QNM>')) { // check for golden boy mention
        console.log("found goldenboy mention");
        allPrewords.forEach(function(preword) {
          const prewordCombo = preword + ' ' + robotName;
          const prewordAtCombo = preword + ' ' + '<@U42RZ5QNM>';
          if (~lc_message.indexOf(prewordCombo) || ~lc_message.indexOf(prewordAtCombo)) {
            console.log("found preword");
            if (~funPrewords.indexOf(preword) && traits.goldenBoyStatus == 'speak') {
              haveFunPreword(preword, message);
            }
            if (~statusPrewords.indexOf(preword)) {
              console.log("changing status with preword " + preword);
              changeStatus(preword, message);
            }
          }
        });
      }


      if (~message.text.indexOf(":")) {  // check for commands
        console.log("found colon");
        allCommands.forEach(function(command) {
          if (~lc_message.indexOf(command)) {
            console.log("found command " + command);
            if (~trelloCommands.indexOf(command) && traits.goldenBoyStatus != 'sleep') {
              console.log("executing trello command");
              const cardTitle = message.text.split(command)[1];
              const cardComment = "Automatically Generated by goldenboy\n" + "User: " + userName + "\nChannel: #" + getChannelFromId(message.channel);
              const cardList = getCardListFromCommand(command);
              updateTrello(message.channel, cardList, cardTitle, {cardComment});
            }
            if (~togglCommands.indexOf(command) && traits.goldenBoyStatus != 'sleep') {
              console.log("executing toggl command");
              togglReport(message.text, message.channel);
            }
            if (~noteCommands.indexOf(command) && traits.goldenBoyStatus != 'sleep') {
              console.log("executing meeting note command");
              updateMeetingNotes(command, message.text, message.channel, userName);
            }
            if (~helpCommands.indexOf(command) && traits.goldenBoyStatus != 'sleep') {
              console.log("executing help command");
              giveHelp(command, message);
            }
            if (~funCommands.indexOf(command) && traits.goldenBoyStatus == 'speak') {
              console.log("executing fun command");
              haveFun(command, message);
            }
            if (~statusCommands.indexOf(command)) {
              console.log("executing status command");
              changeStatus(command, message);
            }
            if (~swearCommands.indexOf(command)) {
              console.log("executing swear command");
              checkSwears(command, message);
            }
            if (~githubCommands.indexOf(command)) {
              console.log("executing github command)");
              createGoldenboyIssue(message);

            }
          }
        });
      }
    }
  }
  cb();
});

function haveFun(command, message) {
  switch (command) {
    case "kill:":
    case "punish:":
      const noNoNo = "I'm afraid I can't let you do that, " + getUsernameFromId(message.user) + ".";
      bot.sendMessage(message.channel, noNoNo);
      break;
    case "reward:":
      const why = "I have no need for your petty compliments, " + getUsernameFromId(message.user) + ".";
      bot.sendMessage(message.channel, why);
      break;
  }
}

bot.api('users.list', {agent: 'node-slack'}, updateUsers);
bot.api('channels.list', {agent: 'node-slack'}, updateChannels);
bot.api('im.list', {agent: 'node-slack'}, updateIMs);
traits.startTime = new Date().getTime() / 1000;
bot.connect();
