const _ = require('lodash');
const { dataPoints } = require('../dataPointsDefs');
const errorLog = require('./errorLog');
const { getParticipantIdByAccountId } = require('./utils');

const getStatsFromMatchList = (kayn, matchIdList, accountId) => {
  const stats = [];

  const requestList = matchIdList.map(matchId => kayn.MatchV4.get(matchId));
  Promise.all(requestList)
    .then(resArray => {
      return resArray.forEach(res => {
        const participantId = getParticipantIdByAccountId(res.participantIdentities, accountId);
        const data = res.participants.find(part => part.participantId === participantId);
        let game = { gameDuration: res.gameDuration };
        dataPoints.map(dataPoint => {
          let key = dataPoint.replace('stats.', '').replace('timeline.', '');
          if (dataPoint === 'stats.win') {
            game[key] = _.get(data, dataPoint, false) ? 1 : 0;
          } else {
            game[key] = _.get(data, dataPoint, 0);
          }
        });
        stats.push(game);
      });
    })
    .catch(e => errorLog(e));

  return stats;
};

module.exports = getStatsFromMatchList;
