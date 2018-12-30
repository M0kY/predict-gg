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

module.exports = {
  getParticipantIdByAccountId,
  getSummonerByParticipantId,
  filterNGamesByTime,
}
