
require('dotenv').config();
const chalk = require('chalk');
const { Kayn, REGIONS } = require('kayn');
const _ = require('lodash');
const moment = require('moment');
const dataPointsObject = require('./src/dataPointsDefs');

const tf = require('@tensorflow/tfjs');
require('./src/dbconnect');
const ClassificationModel = require('./src/models/classificationModel.js');
const PredictionsModel = require('./src/models/predictionsModel.js')

const GAMES_PER_PLAYER = parseInt(process.env.GAMES_PER_PLAYER, 10) || 30;
const RANKED_5X5_SOLO = parseInt(process.env.QUEUE_ID, 10) || 420;

const region = process.argv[2];
const summonerName = process.argv[3];

const errorLog = e => {
  if (e.error) {
    if (e.statusCode === 404) {
      console.log(chalk.bgRed(`No live game found for given summoner.`));
    } else {
      const error = JSON.parse(e.error.error);
      console.log(chalk.bgRed(`Error ${error.status.status_code} - ${error.status.message}`));
    }  
  } else {
    console.log(chalk.bgRed(`Error ${e.message}`));
  }
};

const getParticipantIdByAccountId = (participantIdentities, accountId) => (
  participantIdentities.find(part => part.player.currentAccountId === accountId).participantId
);

let champions = {};

const main = async () => {
  
  if (!region || !Object.values(REGIONS).includes(region)) {
    console.log(chalk.bgRed('Invalid region provided', region));
    process.exit(0);
  }

  if (!summonerName) {
    console.log(chalk.bgRed('No summoner name provided', summonerName));
    process.exit(0);
  }

  try {
    const startTime = moment();

    const kayn = Kayn(process.env.RIOT_API_KEY)({
      region: region,
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

    const summoner = await kayn.SummonerV4.by.name(summonerName);

    const liveGame = await kayn.CurrentGameV4.by.summonerID(summoner.id);

    const playerStats = await getParticipantsData(kayn, liveGame.participants);
    

    const modelData = await ClassificationModel.findOne().sort({ field: 'asc', _id: -1 }).limit(1);
    const model = await tf.loadModel(tf.io.fromMemory(
      JSON.parse(modelData.modelTopology), modelData.weightSpecs, new Uint8Array(modelData.weightData.buffer).buffer
    ));

    const testingData = tf.tensor3d([playerStats.map(prop =>  
      Object.keys(prop).map(key => prop[key])
    )]);

    const result = model.predict(testingData);
    result.print();

    const executionDuration = moment.duration(moment().diff(startTime))

    await PredictionsModel.create({
      gameId: liveGame.gameId,
      regionId: liveGame.platformId,
      queueId: liveGame.gameQueueConfigId,
      gameCreation: liveGame.gameStartTime,
      executionDurationInMs: executionDuration,
      classificationModelId: modelData._id,
      prediction: Array.prototype.slice.call(result.dataSync())
    });
    console.log(chalk.black.bgGreen('Prediction record added to database.'))

    console.log(chalk.black.bgYellow(`Script execution time: ${_.round(executionDuration.asMinutes(), 2)} min`));
    process.exit(0);
  } catch(e) {
    errorLog(e);
  }
}

const getParticipantsData = async (kayn, participants) => {
  const gameStats2d = [];
  for await (const pl of participants) {
    
    try {
      const summoner = await kayn.SummonerV4.by.id(pl.summonerId);
      const gameList = await kayn.MatchlistV4.by.accountID(summoner.accountId).query({ queue: RANKED_5X5_SOLO, championId: pl.championId });
      const list = gameList.matches.map(game => game.gameId).slice(0, GAMES_PER_PLAYER);
     
      console.log(chalk.bgMagenta(`================== ${summoner.name} ==================`));
      
      console.log(
        summoner.accountId,
        pl.teamId,
        list.length,
        champions.data[pl.championId].name
      );
      
      const stats = { teamId: pl.teamId, ...await getStatsFromMatchList(kayn, list, summoner.accountId)};
      gameStats2d.push(stats);

    } catch(e) {
      errorLog(e);
    }
  }
  return gameStats2d;
}

const getStatsFromMatchList = async (kayn, matchIdList, accountId) => {
  let stats = {};
  dataPointsObject.map(dataPoint => {
    const key = dataPoint.replace('stats.', '').replace('timeline.', '');
    stats[key] = 0;
  });
  stats['numberOfGames'] = 0;

  for (const matchId of matchIdList) {
    try {
      const res = await kayn.MatchV4.get(matchId);
      const participantId = getParticipantIdByAccountId(res.participantIdentities, accountId);
      const data = res.participants.find(part => part.participantId === participantId);
      dataPointsObject.map(dataPoint => {
        let key = dataPoint.replace('stats.', '').replace('timeline.', '');
        if (dataPoint === 'stats.win') {
          stats[key] = stats[key] + (_.get(data, dataPoint, false) ? 1 : 0);
        } else {
          stats[key] = stats[key] + _.get(data, dataPoint, 0);
        }
      });
      stats.numberOfGames = stats.numberOfGames + 1;

    } catch(e) {
      errorLog(e);
    }
  }

  for (const dataPoint in stats) {
    if (stats[dataPoint] && dataPoint !== 'numberOfGames') {
      stats[dataPoint] = _.round(stats[dataPoint] / matchIdList.length, 2)
    }
  }

  return stats;
};

main();
