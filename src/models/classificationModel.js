const mongoose = require('mongoose');
const timestamps = require('mongoose-timestamp');

const classificationSchema = new mongoose.Schema(
  {
    modelTopology: String,
    weightData: Buffer,
    weightSpecs: Array,
  },
  {
    collection: 'classification-model',
  },
);

classificationSchema.plugin(timestamps);

const model = mongoose.model('classification-model', classificationSchema);
module.exports = model;
