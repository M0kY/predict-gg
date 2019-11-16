require('dotenv').config();
const chalk = require('chalk');
const mongoose = require('mongoose');

if (
  typeof process.env.MONGODB_CONNECTION_STRING === 'undefined' ||
  process.env.MONGODB_CONNECTION_STRING === null ||
  process.env.MONGODB_CONNECTION_STRING === ''
) {
  const mongooseUri = `mongodb://${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DBNAME}
  `;

  const mongooseOptions = {
    authSource: process.env.MONGODB_AUTH_SOURCE,
    auth: {
      user: process.env.MONGODB_USERNAME,
      password: decodeURIComponent(process.env.MONGODB_PASSWORD),
    },
    ssl: process.env.MONGODB_SSL === 'true',
    replicaSet: process.env.MONGODB_REPLICASET,
    validateOptions: true,
    loggerLevel: 'error',
    useNewUrlParser: true,
  };
  mongoose
    .connect(mongooseUri, mongooseOptions)
    .then(() => {
      console.log(chalk.black.bgGreen('Successfully connected to MongoDB.'));
    })
    .catch((err) => {
      console.log(chalk.bgRed('Unable to connect to the MongoDB database.'));
      console.error(chalk.bgRed('Error:', err));
    });
} else {
  mongoose
    .connect(process.env.MONGODB_CONNECTION_STRING, { useNewUrlParser: true })
    .then(() => {
      console.log(chalk.black.bgGreen('Successfully connected to MongoDB using connection string.'));
    })
    .catch((err) => {
      console.log(chalk.bgRed('Unable to connect to the MongoDB database using connection string.'));
      console.error(chalk.bgRed('Error:', err));
    });
}

const db = mongoose.connection;

module.exports = db;
