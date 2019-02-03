const getParticipantIdByAccountId = (participantIdentities, accountId) => (
  participantIdentities.find(part => part.player.currentAccountId === accountId).participantId
);

const getSummonerByParticipantId = (participantIdentities, participantId) => (
  participantIdentities.find(part => part.participantId === participantId)
);

const filterNGamesByTime = (matches, numberOfGames, gameCreation) => {
  return matches.filter(game =>
    game.timestamp < gameCreation
  ).map(game => game.gameId).slice(0, numberOfGames);
};

const getObjectKeys = (object) => {
  return Object.keys(object).filter(key => 
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
}

const sumArrayOfObjectsByProps = (stats) => {
  const len = stats[0] ? getObjectKeys(stats[0]).length : 54;
  let gameStats = Array(len).fill(0);
  if (stats[0]) {
    const keys = getObjectKeys(stats[0]);
    stats.map(game => {
      keys.map((key, index) => gameStats[index] += (typeof game[key] === 'boolean' ? +game[key] : game[key] /*/ game.gameDuration*/));
    });
  }
  return gameStats;
}

module.exports = {
  getParticipantIdByAccountId,
  getSummonerByParticipantId,
  filterNGamesByTime,
  sumArrayOfObjectsByProps,
}
