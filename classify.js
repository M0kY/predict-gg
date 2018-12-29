require('dotenv').config();
const tf = require('@tensorflow/tfjs');
//require("@tensorflow/tfjs-node");
const _ = require('lodash');
const chalk = require('chalk');

require('./src/dbconnect');
const GameStatsModel = require('./src/models/gameStatsModel.js');
const ClassificationModel = require('./src/models/classificationModel.js');

const TEST_BATCH_SIZE = process.env.TEST_BATCH_SIZE;

const main = async () => {
  
  try {
    const data = await GameStatsModel.find({})
    console.log(chalk.black.bgGreen('DB data successfuly loaded.'))

    let winCount = { blueTeam: 0, redTeam: 0 }
    data.map(record => {
      record.winner === 1 ? winCount.blueTeam = winCount.blueTeam + 1 : winCount.redTeam = winCount.redTeam + 1
    });
    console.log(chalk.bgMagenta('Dataset winners ratio BLUE TEAM WINS:', winCount.blueTeam, 'RED TEAM WINS:', winCount.redTeam))

    const trainX = data.map(record => record.stats).slice(0, data.length - TEST_BATCH_SIZE);
    const trainY = data.map(record => record.winner).slice(0, data.length - TEST_BATCH_SIZE);

    const testX = data.map(record => record.stats).slice(-TEST_BATCH_SIZE);
    const testY = data.map(record => record.winner).slice(-TEST_BATCH_SIZE);

    const inputShape = [data[0].stats.length, Object.keys(data[0].stats[0]).length];

    const trainingData = tf.tensor3d(trainX.map(record => record.map(prop =>   
      Object.keys(prop).map(key => prop[key])
    )));
    const testingData = tf.tensor3d(testX.map(record => record.map(prop =>  
      Object.keys(prop).map(key => prop[key])
    )));

    const trainingLabels = tf.tensor2d(trainY.map(score => 
      score === 1 ? [1, 0] : [0, 1]
    ));
    const testingLabels = tf.tensor2d(testY.map(score => 
      score === 1 ? [1, 0] : [0, 1]
    ));
    
    const model = tf.sequential();
   
    model.add(tf.layers.batchNormalization({ inputShape }));
    model.add(tf.layers.flatten());

    model.add(tf.layers.dense({
      activation: 'relu',
      units: 15,
      kernelInitializer: 'varianceScaling',
      useBias: true
    }));
    
    model.add(tf.layers.dense({
      activation: 'softmax',
      units: 2,
      kernelInitializer: 'varianceScaling',
      useBias: false,
    }));
    
    model.compile({
      loss: 'categoricalCrossentropy',
      optimizer: tf.train.adam(.009),
    });
    
    const history = await model.fit(trainingData, trainingLabels, {epochs: 100})
    console.log(chalk.black.bgYellow('Loss:', history.history.loss[history.history.loss.length - 1]));
    
    model.predict(testingData).print();
    testingLabels.print();
    console.log('Testing data game IDs:', data.slice(-TEST_BATCH_SIZE).map(record => record.gameId));
    
    const saveModel = await model.save(tf.io.withSaveHandler(obj2save => obj2save));
    await ClassificationModel.create({
      modelTopology: JSON.stringify(saveModel.modelTopology), 
      weightData: Buffer.from(new Uint8Array(saveModel.weightData)),
      weightSpecs: saveModel.weightSpecs
    });
    console.log(chalk.black.bgGreen('Model saved to database.'));

    process.exit(0);

  } catch(e) {
    console.log(chalk.bgRed('Error:', e.message));
    process.exit(1);
  }
}

main();
