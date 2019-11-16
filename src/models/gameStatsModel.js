const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');

const gameStatsSchema = new mongoose.Schema(
  {
    gameId: Number,
    regionId: String,
    seasonId: Number,
    queueId: Number,
    gameCreation: Number,
    version: String,
    stats: {},
    winner: Number,
  },
  {
    collection: 'gamestats',
  },
);

gameStatsSchema.plugin(timestamps);

const model = mongoose.model('gamestats', gameStatsSchema);
module.exports = model;
