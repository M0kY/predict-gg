const mongoose = require('mongoose');

const gameStatsSchema = new mongoose.Schema({
    gameId: Number,
    stats: {},
    winner: Number,
}, {
    collection: 'gameStats',
});

const model = mongoose.model('gameStats', gameStatsSchema);
module.exports = model;