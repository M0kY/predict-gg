const tf = require("@tensorflow/tfjs");
//require("@tensorflow/tfjs-node");



const trainingData = tf.tensor3d();
const outputData = tf.tensor2d();

const model = tf.sequential()

model.add(tf.layers.dense({
  inputShape: [10, 20],
  activation: "sigmoid",
  units: 5,
}))
model.add(tf.layers.dense({
  activation: "sigmoid",
  units: 3,
}))

model.add(tf.layers.flatten());

model.add(tf.layers.dense({
  activation: "sigmoid",
  units: 2,
}))

model.compile({
  loss: "meanSquaredError",
  optimizer: tf.train.adam(.06),
})

model.fit(trainingData, outputData, {epochs: 100})
  .then((history) => {
    console.log(history);
})