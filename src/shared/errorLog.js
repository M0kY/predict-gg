const errorLog = (e) => {
  if (e.error) {
    const error = JSON.parse(e.error.error);
    throw new Error(`${error.status.status_code} - ${error.status.message}`);
  } else {
    throw new Error(`${e.message}`);
  }
};

module.exports = errorLog;
