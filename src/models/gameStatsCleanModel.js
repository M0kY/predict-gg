const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');

const gameStatsSchema = new mongoose.Schema(
  {
    stats: Array,
    winner: Number,
  },
  {
    collection: 'gamestats-clean',
  },
);

gameStatsSchema.plugin(timestamps);

const model = mongoose.model('gamestatsClean', gameStatsSchema);
module.exports = model;
