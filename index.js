require('dotenv').config();
const _ = require('lodash');
const { Kayn, REGIONS } = require('kayn');
const moment = require('moment');
const chalk = require('chalk');

// connect to database with mongoose
require('./src/dbconnect');
const GameStatsModel = require('./src/models/gameStatsModel.js');

const { getSummonerByParticipantId, filterNGamesByTime } = require('./src/shared/utils');
const getStatsFromMatchList = require('./src/shared/getStatsFromMatchList');
const errorLog = require('./src/shared/errorLog');

const MATCH_ID = parseInt(process.env.STARTING_MATCH_ID, 10);
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE, 10) || 500;
const GAMES_PER_PLAYER = parseInt(process.env.GAMES_PER_PLAYER, 10) || 30;

const RANKED_5X5_SOLO = parseInt(process.env.QUEUE_ID, 10) || 420;

const REGION = REGIONS[process.env.MATCH_REGION] || REGIONS.EUROPE_WEST;

const logInitialSettings = () => {
  console.log(chalk.black.bgMagenta('Settings:', 
    'Region:', REGION, 
    'Queue ID:', RANKED_5X5_SOLO,
    'Games per player:', GAMES_PER_PLAYER,
    'Batch size:', BATCH_SIZE
  ));
}

let champions = {};

const main = async () => {
  try {

    if (!MATCH_ID || typeof MATCH_ID !== 'number') {
      throw new Error('Error: STARTING_MATCH_ID env variable not specified or invalid');
    }

    logInitialSettings();

    const kayn = Kayn(process.env.RIOT_API_KEY)({
      region: REGION,
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

    champions = await kayn.DDragon.Champion.listFullDataByIdWithParentAsId();

    const matchIdList = _.range(MATCH_ID, MATCH_ID - BATCH_SIZE);

    const startTime = moment();
    for await (const matchId of matchIdList) {
      try {
        const gameStatsTime = moment();
        const res = await kayn.MatchV4.get(matchId)
          .then()
          .catch(e => {
            errorLog(e);
          });

        if (res.queueId !== RANKED_5X5_SOLO) {
          console.log(chalk.black.bgYellow(`Skipping match ${res.gameId} due to queue not being RANKED_5X5_SOLO`));
          continue;
        }

        const dbData = await GameStatsModel.findOne({ gameId: res.gameId });
        if (dbData) {
          console.log(chalk.black.bgYellow(`Skipping match ${res.gameId} due to already being in the database`));
          continue;
        }

        const winner = res.teams.find(teamData => teamData.teamId === 100).win === 'Win' ? 1 : 2;
        
        console.log(chalk.black.bgMagenta(
          `==== GAME ID: ${res.gameId} TIME: ${moment(res.gameCreation, 'x').format("DD/MM/YYYY HH:mm:ss")} WINNER: ${winner} ===`
        ));
      
        const participantIdentities = _.get(res, 'participantIdentities', []);
        const mlGameData = await getParticipantsHistory(kayn, res.participants, participantIdentities, res.gameCreation);
        
        if (mlGameData.length !== 10) {
          console.log(chalk.black.bgYellow(`Skipping match ${res.gameId} due to missing participants data`));
          continue;
        }

        const dbRes = await GameStatsModel.create({ 
          gameId: res.gameId,
          regionId: res.platformId,
          seasonId: res.seasonId,
          queueId: res.queueId,
          gameCreation: res.gameCreation,
          version: res.gameVersion,
          stats: mlGameData, 
          winner
        });

        if (dbRes) { console.log(chalk.black.bgGreen('DB record created')) };

        console.log(chalk.black.bgYellow(`Game execution time: ${_.round(moment.duration(moment().diff(gameStatsTime)).asMinutes(), 2)} min`));

      } catch (e) {
        console.log(chalk.bgRed(e));
        console.log(chalk.bgRed('SKIPPING GAME DUE TO ERROR'));
      }
    }
    console.log(chalk.black.bgYellow(`Script execution time: ${_.round(moment.duration(moment().diff(startTime)).asMinutes(), 2)} min`));
  
  } catch(e) {
    console.log(chalk.bgRed(e))
  }
  process.exit(0);
}

const getParticipantsHistory = async (kayn, participants, participantIdentities, gameCreation) => {
  const gameStats2d = [];
  for await (const pl of participants) {
    const summoner = getSummonerByParticipantId(participantIdentities, pl.participantId);
    
    try {
      const gameList = await kayn.MatchlistV4.by.accountID(summoner.player.currentAccountId).query({ queue: RANKED_5X5_SOLO, championId: pl.championId });
      const list = filterNGamesByTime(gameList.matches, GAMES_PER_PLAYER, gameCreation);
     
      console.log(`================== ${summoner.player.summonerName} ==================`)
      
      console.log(
        summoner.player.currentAccountId,
        pl.participantId,
        list.length,
        champions.data[pl.championId].name
      );

      const stats = { teamId: pl.teamId, championId: pl.championId, ...await getStatsFromMatchList(kayn, list, summoner.player.currentAccountId)};
      gameStats2d.splice(pl.participantId, 0, stats);

    } catch(e) {
      errorLog(e);
    }
  }
  return gameStats2d;
}

main();
