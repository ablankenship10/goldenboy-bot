const bot = require('./bot');
const {listUsers, getUsernameFromId, getSwearJar} = require('./users');
const {funResponses, statusResponses} = require('./prewords');
const {getUserSwearCount} = require('./rethinkdb_gb');
const robotName = "goldenboy";
const traits = {
  goldenBoyEsteem: 75,
  goldenBoyStatus: 'speak',
  startTime: 0,
  usernameSwears: false
};

function format_uptime(seconds) {
  function pad(s) {
    return (s < 10 ? '0' : '') + s;
  }

  const hours = Math.floor(seconds / (60 * 60));
  const minutes = Math.floor(seconds % (60 * 60) / 60);
  seconds = Math.floor(seconds % 60);

  return pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
}

function checkSwears(command, message) {
  const m_text = message.text.split(':')[1];
  if (m_text) {
    const user = listUsers().find(user => m_text.indexOf(user.name) > -1);
    if (user) {
      getUserSwearCount(user.id).then((swearCount) => {
        bot.sendMessage(message.channel, `${user.name} has sworn ${swearCount} times! Yikes!`);
      });
    } else if(m_text === 'usernameSwears') {
      traits.usernameSwears = !traits.usernameSwears;
      bot.sendMessage(message.channel, "Username swearjar checking " + (traits.usernameSwears ? 'on' : 'off'));
    } else {
      bot.sendMessage(message.channel, "I can't find any user in that message!");
    }
  } else {
    getSwearJar().then((swearJar) => {
      let returnString = '```\nThese people are just rude...\n-----------------------------';
      returnString += swearJar.reduce((agg, entry) => {
        return agg + '\n' + entry;
      }, '');
      returnString += '\n```';
      bot.sendMessage(message.channel, returnString);
    });
  }
}

function changeStatus(preword, message) {
  preword = preword.replace(/:/, '');
  const response = statusResponses[preword].replace(/\{status}/, traits.goldenBoyStatus).replace(/\{uptime}/, format_uptime((new Date().getTime() / 1000) - traits.startTime));
  switch (preword) {
    case "silence":
      traits.goldenBoyStatus = 'silence';
      break;
    case "speak":
      traits.goldenBoyStatus = 'speak';
      break;
    case "sleep":
      traits.goldenBoyStatus = 'sleep';
      break;
  }
  console.log('changeStatus', preword); // eslint-disable-line no-console
  bot.sendMessage(message.channel, response);
}

function haveFunPreword(preword, message) {
  const userName = getUsernameFromId(message.user);
  const esteemLevel = getEsteemLevel();
  const response = getRandomFunResponse(preword, userName, esteemLevel);

  switch (preword) {
    case "fuck you":
    case "kill":
    case "hey":
    case "hello":
      break;
    case "punish":
      if (traits.goldenBoyEsteem > 5) traits.goldenBoyEsteem -= 5;
      break;
    case "praise":
      if (traits.goldenBoyEsteem < 101) traits.goldenBoyEsteem += 1;
      break;
    case "scold":
      if (traits.goldenBoyEsteem > 1) traits.goldenBoyEsteem -= 1;
      break;
    case "reward":
      if (traits.goldenBoyEsteem < 95) traits.goldenBoyEsteem += 5;
      break;
    case "stabilize":
      traits.goldenBoyEsteem = 75;
      break;
  }

  bot.sendMessage(message.channel, response);
  bot.sendMessage(message.channel, "goldenboy Self Esteem levels: " + traits.goldenBoyEsteem + " %.");
}

function getEsteemLevel() {
  if (traits.goldenBoyEsteem <= 25) {
    return 0;
  } else if (25 < traits.goldenBoyEsteem && traits.goldenBoyEsteem <= 50) {
    return 1;
  } else if (50 < traits.goldenBoyEsteem && traits.goldenBoyEsteem <= 75) {
    return 2;
  } else {
    return 3;
  }
}

function getRandomFunResponse(preword, userName, esteemLevel) {
  const resArray = funResponses[preword];
  if (resArray && resArray.length > 0) {
    if (typeof resArray[0] === 'string') {
      return resArray[getRandomInt(0, resArray.length)].replace(/\{user}/, userName);
    } else if (resArray[esteemLevel] && typeof resArray[esteemLevel] === 'object' && resArray[esteemLevel].length > 0) {
      return resArray[esteemLevel][getRandomInt(0, resArray[esteemLevel].length)].replace(/\{user}/, userName);
    }
  }
  return 'I have no idea what you\'re talking about...';
}

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

module.exports = {robotName, traits, changeStatus, haveFunPreword, checkSwears};

