const _ = require('lodash');
const { dataPoints } = require('../dataPointsDefs');

const getParticipantIdByAccountId = (participantIdentities, accountId) => {
  return participantIdentities.find((part) => part.player.currentAccountId === accountId).participantId;
};

const getSummonerByParticipantId = (participantIdentities, participantId) => {
  return participantIdentities.find((part) => part.participantId === participantId);
};

const filterNGamesByTime = (matches, numberOfGames, gameCreation) => {
  return matches
    .filter((game) => game.timestamp < gameCreation)
    .map((game) => game.gameId)
    .slice(0, numberOfGames);
};

const getObjectKeys = (object) => {
  return Object.keys(object).filter((key) => {
    return (
      key !== 'magicDamageDealtToChampions' &&
      key !== 'physicalDamageDealtToChampions' &&
      key !== 'magicDamageDealt' &&
      key !== 'magicalDamageTaken' &&
      key !== 'trueDamageTaken' &&
      key !== 'trueDamageDealt' &&
      key !== 'physicalDamageDealt' &&
      key !== 'physicalDamageTaken' &&
      key !== 'trueDamageDealtToChampions'
    );
  });
};

const sumArrayOfObjectsByProps = (stats) => {
  const len = stats[0] ? getObjectKeys(stats[0]).length : 54;
  const gameStats = Array(len).fill(0);
  if (stats[0]) {
    const keys = getObjectKeys(stats[0]);
    stats.forEach((game) => {
      keys.forEach((key, index) => {
        gameStats[index] += typeof game[key] === 'boolean' ? +game[key] : game[key]; /* / game.gameDuration */
      });
    });
  }
  return gameStats;
};

const sumObjectFromArrayOfObjects = (stats) => {
  const sumObject = { gameDuration: 0 };
  dataPoints.forEach((dataPoint) => {
    const key = dataPoint.replace('stats.', '').replace('timeline.', '');
    sumObject[key] = 0;
  });

  const keys = Object.keys(sumObject);
  keys.forEach((key) => {
    sumObject[key] = _.sumBy(stats, key);
  });

  return sumObject;
};

module.exports = {
  getParticipantIdByAccountId,
  getSummonerByParticipantId,
  filterNGamesByTime,
  sumArrayOfObjectsByProps,
  sumObjectFromArrayOfObjects,
};
