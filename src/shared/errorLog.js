const chalk = require('chalk');

const errorLog = e => {
  if (e.error) {
    const error = JSON.parse(e.error.error);
    throw new Error(chalk.bgRed(`Error ${error.status.status_code} - ${error.status.message}`));
  } else {
    throw new Error(chalk.bgRed(`Error ${e.message}`));
  }
};

module.exports = errorLog;
