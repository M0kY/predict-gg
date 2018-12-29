const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');

const predictionsSchema = new mongoose.Schema({
    gameId: Number,
    regionId: String,
    queueId: Number,
    gameCreation: Number,
    executionDurationInMs: Number,
    classificationModelId: String,
    prediction: Array
}, {
    collection: 'predictions',
});

predictionsSchema.plugin(timestamps);

const model = mongoose.model('predictions', predictionsSchema);
module.exports = model;