require('dotenv').config();
const tf = require('@tensorflow/tfjs');
require("@tensorflow/tfjs-node");
const _ = require('lodash');
const chalk = require('chalk');
const moment = require('moment');

require('./src/dbconnect');
const GameStatsCleanModel = require('./src/models/gameStatsCleanModel.js');
const ClassificationModel = require('./src/models/classificationModel.js');

const TEST_BATCH_SIZE = process.env.TEST_BATCH_SIZE;

const main = async () => {
  const startTime = moment();
  try {
    const data = await GameStatsCleanModel.find({})
    console.log(chalk.black.bgGreen('DB data successfuly loaded.'))

    let winCount = { blueTeam: 0, redTeam: 0 }
    data.map(record => {
      record.winner === 1 ? winCount.blueTeam += 1 : winCount.redTeam += 1
    });
    console.log(chalk.bgMagenta('Dataset winners ratio BLUE TEAM WINS:', winCount.blueTeam, 'RED TEAM WINS:', winCount.redTeam))

    const trainX = data.map(record => record.stats).slice(0, data.length - TEST_BATCH_SIZE);
    const trainY = data.map(record => record.winner).slice(0, data.length - TEST_BATCH_SIZE);

    const testX = data.map(record => record.stats).slice(-TEST_BATCH_SIZE);
    const testY = data.map(record => record.winner).slice(-TEST_BATCH_SIZE);

    const inputShape = [data[0].stats.length, Object.keys(data[0].stats[0]).length];

    const trainingData = tf.tensor3d(trainX.map(record => record.map((prop, index) =>
      index < 7 && index !== 2 && prop.numberOfGames > 0 ? _.round(prop/record[2], 2) : prop)
    ));
    const testingData = tf.tensor3d(testX.map(record => record.map((prop, index) =>
      index < 7 && index !== 2 && prop.numberOfGames > 0 ? _.round(prop/record[2], 2) : prop)
    ));

    const trainingLabels = tf.tensor2d(trainY.map(score => 
      score === 1 ? [1, 0] : [0, 1]
    ));
    const testingLabels = tf.tensor2d(testY.map(score => 
      score === 1 ? [1, 0] : [0, 1]
    ));

    const model = tf.sequential();

    model.add(tf.layers.batchNormalization({ inputShape }));

    model.add(tf.layers.leakyReLU());
    model.add(tf.layers.leakyReLU());
    model.add(tf.layers.dropout({
      rate: 0.5
    }));  
    model.add(tf.layers.leakyReLU());
    model.add(tf.layers.leakyReLU());

    model.add(tf.layers.flatten());

    model.add(tf.layers.dense({
      activation: 'softmax',
      units: 2,
      kernelInitializer: 'varianceScaling',
      useBias: false,
    }));
    
    model.compile({
      loss: 'categoricalCrossentropy',
      optimizer: tf.train.adam(.001),
      metrics: ['accuracy'],
    });
    
    const history = await model.fit(trainingData, trainingLabels, {
      epochs: 1000,
      validationSplit: 0.2,
      //verbose: 0,
      shuffle: true,
    })
    console.log(chalk.black.bgYellow('Loss:', history.history.loss[history.history.loss.length - 1]));
    console.log(chalk.black.bgYellow('Acc:', history.history.acc[history.history.acc.length - 1]));
    
    const results = model.predict(testingData);
    results.print()
    
    let sum = 0;
    let filteredSum = 0;
    let count = 0;
    const values = Array.from(results.max(1).dataSync());
    Array.from(results.argMax(1).dataSync()).map((prediction, index) => {
      prediction === Array.from(testingLabels.argMax(1).dataSync())[index] && sum++;
      if (values[index] > process.env.ACCURACY_FILTER) {
        count++;
        prediction === Array.from(testingLabels.argMax(1).dataSync())[index] && filteredSum++;
      };
    });
    console.log(`Test Accuracy: ${sum} / ${TEST_BATCH_SIZE} - ${_.round(sum/TEST_BATCH_SIZE*100, 2)}%,`);
    console.log(`Filtered Accuracy (values greater than ${process.env.ACCURACY_FILTER}): ${filteredSum} / ${count} - ${_.round(filteredSum/count*100, 2) || 0}%,`)
    
    const saveModel = await model.save(tf.io.withSaveHandler(obj2save => obj2save));
    await ClassificationModel.create({
      modelTopology: JSON.stringify(saveModel.modelTopology), 
      weightData: Buffer.from(new Uint8Array(saveModel.weightData)),
      weightSpecs: saveModel.weightSpecs
    });
    console.log(chalk.black.bgGreen('Model saved to database.'));

  } catch(e) {
    console.log(chalk.bgRed('Error:', e.message));
  }
  console.log(chalk.black.bgYellow(`Script execution time: ${_.round(moment.duration(moment().diff(startTime)).asMinutes(), 2)} min`));
  process.exit(0);
}

main();
