require('dotenv').config();
const _ = require('lodash');
const chalk = require('chalk');
const moment = require('moment');

require('./src/dbconnect');
const GameStatsModel = require('./src/models/gameStatsModel.js');
const GameStatsCleanModel = require('./src/models/gameStatsCleanModel.js');

const main = async () => {
  const startTime = moment();
  try {
    const data = await GameStatsModel.find({})
    const cleanData = data.map(record => {
      const cleanStats = record.stats.map(playerStats => {
        let gameStats = Array(70).fill(0);
        playerStats.stats.map(game => {
          const keys = Object.keys(game);
          keys.map((key, index) => gameStats[index] += (typeof game[key] === 'boolean' ? +game[key] : game[key] /*/ game.gameDuration*/));
        })
        //gameStats = gameStats.map(stat => stat/playerStats.numberOfGames);
        gameStats.unshift(
          playerStats.teamId, 
          playerStats.championId, 
          playerStats.numberOfGames, 
          playerStats.spell1Id, 
          playerStats.spell2Id, 
          playerStats.championMastery, 
          playerStats.highestAchievedSeasonTier
        );
        return gameStats;
      });
      return { stats: cleanStats, winner: record.winner };
    });
    
    await GameStatsCleanModel.create(cleanData)
    .then(() => console.log('Data inserted into DB'));
  
  } catch(e) {
    console.log(chalk.bgRed('Error:', e.message));
  }
  console.log(chalk.black.bgYellow(`Cleaning execution time: ${_.round(moment.duration(moment().diff(startTime)).asMinutes(), 2)} min`));
  process.exit(0);
}

main();
