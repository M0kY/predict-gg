const _ = require('lodash');
const dataPointsObject = require('../dataPointsDefs');
const errorLog = require('./errorLog');
const { getParticipantIdByAccountId } = require('./utils');

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

  return stats;
};

module.exports = getStatsFromMatchList;
