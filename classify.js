const tf = require("@tensorflow/tfjs");
//require("@tensorflow/tfjs-node");
const _ = require('lodash');
const chalk = require('chalk');

require('./src/dbconnect');
const GameStatsModel = require('./src/model.js');

const main = async () => {
  
  try {
    const data = await GameStatsModel.find({})
    console.log(chalk.black.bgGreen('DB data successfuly loaded.'))

    const trainX = data.map(record => record.stats).slice(0, data.length - 3);
    const trainY = data.map(record => record.winner).slice(0, data.length - 3);

    const testX = data.map(record => record.stats).slice(-3);
    const testY = data.map(record => record.winner).slice(-3);
    
    
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
    
    model.add(tf.layers.dense({
      inputShape: [10, 20],
      activation: "sigmoid",
      units: 5,
    }));
    model.add(tf.layers.dense({
      activation: "sigmoid",
      units: 3,
    }));
    
    model.add(tf.layers.flatten());
    
    model.add(tf.layers.dense({
      activation: "sigmoid",
      units: 2,
    }));
    
    model.compile({
      loss: "meanSquaredError",
      optimizer: tf.train.adam(.06),
    });
    
    model.fit(trainingData, trainingLabels, {epochs: 100})
      .then((history) => {
        console.log(`Loss: ${history.history.loss[history.history.loss.length - 1]}`);
        model.predict(testingData).print()
        testingLabels.print();
    });

  } catch(e) {
    console.log(chalk.bgRed(`Error: ${e.message}`));
  }
}

main();