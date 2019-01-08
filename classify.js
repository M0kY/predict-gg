require('dotenv').config();
const tf = require('@tensorflow/tfjs');
require("@tensorflow/tfjs-node");
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
    // [prop.teamId, prop.kills*prop.numberOfGames, prop.deaths*prop.numberOfGames, prop.win*prop.numberOfGames]
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
      activation: 'sigmoid',
      units: 40,
      kernelInitializer: 'varianceScaling',
      useBias: true
    }));

    model.add(tf.layers.dense({
      activation: 'sigmoid',
      units: 35,
      kernelInitializer: 'varianceScaling',
      useBias: true
    }));

    model.add(tf.layers.dense({
      activation: 'sigmoid',
      units: 15,
      kernelInitializer: 'varianceScaling',
      useBias: false
    }));

    model.add(tf.layers.dense({
      activation: 'sigmoid',
      units: 15,
      kernelInitializer: 'varianceScaling',
      useBias: false
    }));
    
    model.add(tf.layers.dense({
      activation: 'softmax',
      units: 2,
      kernelInitializer: 'varianceScaling',
      useBias: false,
    }));
    
    model.compile({
      loss: 'categoricalCrossentropy',
      optimizer: tf.train.adam(.05),
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
    Array.from(results.argMax(1).dataSync()).map((prediction, index) => {
      prediction === Array.from(testingLabels.argMax(1).dataSync())[index] && sum ++;
    });
    console.log(`Test Accuracy: ${sum} / ${TEST_BATCH_SIZE} - ${_.round(sum/TEST_BATCH_SIZE*100, 2)}%,`);
    
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
  process.exit(0);
}

main();
