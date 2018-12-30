const chalk = require('chalk');

const errorLog = e => {
  if (e.error) {
    const error = JSON.parse(e.error.error);
    console.log(chalk.bgRed(`Error ${error.status.status_code} - ${error.status.message}`));
  } else {
    console.log(chalk.bgRed(`Error ${e.message}`));
  }
};

module.exports = errorLog;
