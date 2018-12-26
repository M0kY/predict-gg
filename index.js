require('dotenv').config();
const _ = require('lodash');
const { Kayn, REGIONS } = require('kayn');
const moment = require('moment');
const chalk = require('chalk');

// connect to database with mongoose
require('./src/dbconnect');
const GameStatsModel = require('./src/model.js');

const dataPointsObject = [
  'stats.visionScore',
  'stats.longestTimeSpentLiving',
  'stats.kills',
  'stats.damageDealtToObjectives',
  'stats.totalDamageTaken',
  'stats.damageSelfMitigated',
  'stats.damageSelfMitigated',
  'stats.assists',
  'stats.totalDamageDealtToChampions',
  'stats.sightWardsBoughtInGame',
  'stats.deaths',
  'stats.win',
  'timeline.goldPerMinDeltas[0-10]',
  'timeline.goldPerMinDeltas[10-20]',
  'timeline.creepsPerMinDeltas[0-10]',
  'timeline.creepsPerMinDeltas[10-20]',
  'timeline.xpPerMinDeltas[0-10]',
  'timeline.xpPerMinDeltas[10-20]',
  'timeline.damageTakenPerMinDeltas[0-10]',
  'timeline.damageTakenPerMinDeltas[10-20]',
];

const MATCH_ID = 3873599449;
const BATCH_SIZE = 30;
const GAMES_PER_PLAYER = 10;

const RANKED_5X5_SOLO = 420;

const matchIdList = _.range(MATCH_ID, MATCH_ID - BATCH_SIZE);


const kayn = Kayn(process.env.RIOT_API_KEY)({
  region: REGIONS.EUROPE_WEST,
  locale: 'en_GB',
  debugOptions: {
      isEnabled: true,
      showKey: false,
  },
  requestOptions: {
      shouldRetry: true,
      numberOfRetriesBeforeAbort: 3,
      delayBeforeRetry: 1000,
      burst: false,
      shouldExitOn403: false,
  },
});

const errorLog = e => {
  if (e.error) {
    const error = JSON.parse(e.error.error);
    console.log(chalk.bgRed(`Error ${error.status.status_code} - ${error.status.message}`));
  } else {
    console.log(chalk.bgRed(`Error ${e.message}`));
  }
}

const filterGamesByTime = (matches, gameCreation) => {
  return matches.filter(game =>
    game.timestamp < gameCreation
  ).map(game => game.gameId).slice(0, GAMES_PER_PLAYER);
}

const getSummonerByParticipantId = (participantIdentities, participantId) => (
  participantIdentities.find(part => part.participantId === participantId)
);

const getParticipantIdByAccountId = (participantIdentities, accountId) => (
  participantIdentities.find(part => part.player.currentAccountId === accountId).participantId
);


const main = async () => {

  try {
    champions = await kayn.DDragon.Champion.listFullDataByIdWithParentAsId();
  } catch(e) {
    errorLog(e);
  }
  const startTime = moment();
  for await (const matchId of matchIdList) {
    try {
      const gameStatsTime = moment();
      const res = await kayn.MatchV4.get(matchId);
      
      if (res.queueId !== RANKED_5X5_SOLO) continue;

      const winner = res.teams.find(teamData => teamData.teamId === 100).win === 'Win' ? 1 : 2
      
      console.log(chalk.black.bgMagenta(
        `==== GAME ID: ${res.gameId} TIME: ${moment(res.gameCreation, 'x').format("DD/MM/YYYY HH:mm:ss")} WINNER: ${winner} ===`
      ));
    
      const participantIdentities = _.get(res, 'participantIdentities', []);
      const mlGameData = await getParticipantsHistory(res.participants, participantIdentities, res.gameCreation);
      //console.log(`================== DATA ==================`);
      //console.log(mlGameData);

      const dbRes = await GameStatsModel.create({ gameId: res.gameId, stats: mlGameData, winner });
      if (dbRes) console.log(chalk.black.bgGreen('DB record created'));

      console.log(chalk.black.bgYellow(`Game execution time: ${_.round(moment.duration(moment().diff(gameStatsTime)).asMinutes(), 2)} min`));

    } catch (e) {
      errorLog(e);
    }
  }
  console.log(chalk.black.bgYellow(`Script execution time: ${_.round(moment.duration(moment().diff(startTime)).asMinutes(), 2)} min`));
}

getParticipantsHistory = async (participants, participantIdentities, gameCreation) => {
  const gameStats2d = [];
  for await (const pl of participants) {
    const summoner = getSummonerByParticipantId(participantIdentities, pl.participantId);
    
    try {
      const gameList = await kayn.MatchlistV4.by.accountID(summoner.player.currentAccountId).query({ queue: RANKED_5X5_SOLO, championId: pl.championId });
      const list = filterGamesByTime(gameList.matches, gameCreation);
     
      console.log(`================== ${summoner.player.summonerName} ==================`)
      
      console.log(
        summoner.player.currentAccountId,
        pl.participantId,
        list.length,
        champions.data[pl.championId].name
      );

      const stats = await getStatsFromMatchList(list, summoner.player.currentAccountId);
      await gameStats2d.splice(pl.participantId, 0, stats);

    } catch(e) {
      errorLog(e);
    }
  }
  return gameStats2d;
}

const getStatsFromMatchList = async (matchIdList, currentAccountId) => {
  let stats = {};
  dataPointsObject.map(dataPoint => {
    const key = dataPoint.replace('stats.', '').replace('timeline.', '');
    stats[key] = 0;
  });

  for (const matchId of matchIdList) {
    try {
      const res = await kayn.MatchV4.get(matchId);
      const participantId = getParticipantIdByAccountId(res.participantIdentities, currentAccountId);
      const data = res.participants.find(part => part.participantId === participantId);
      dataPointsObject.map(dataPoint => {
        let key = dataPoint.replace('stats.', '').replace('timeline.', '');
        if (dataPoint === 'stats.win') {
          stats[key] = stats[key] + (_.get(data, dataPoint, false) ? 1 : 0);
        } else {
          stats[key] = stats[key] + _.get(data, dataPoint, 0);
        }
      });

    } catch(e) {
      errorLog(e);
    }
  }

  for (const dataPoint in stats) {
    stats[dataPoint] = stats[dataPoint] && _.round(stats[dataPoint] / matchIdList.length, 2);
  }
  stats['numberOfGames'] = matchIdList.length;

  return stats;
};

main();
