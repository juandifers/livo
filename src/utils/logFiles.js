const fs = require('fs');
const os = require('os');
const path = require('path');

const getLogsDir = () => {
  if (process.env.LOG_DIR) {
    return process.env.LOG_DIR;
  }

  const isServerlessRuntime = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );

  if (isServerlessRuntime) {
    return path.join(process.env.TMPDIR || os.tmpdir(), 'livo-logs');
  }

  return path.join(__dirname, '../../logs');
};

const getLogFilePath = (filename) => path.join(getLogsDir(), filename);

const ensureLogsDir = () => {
  const logsDir = getLogsDir();

  try {
    fs.mkdirSync(logsDir, { recursive: true });
    return logsDir;
  } catch (error) {
    console.error(`Failed to initialize logs directory at ${logsDir}:`, error.message);
    return null;
  }
};

const appendLogLine = (filename, line) => {
  const logsDir = ensureLogsDir();
  if (!logsDir) {
    console.log(`[log:${filename}] ${line.trimEnd()}`);
    return false;
  }

  try {
    fs.appendFileSync(path.join(logsDir, filename), line);
    return true;
  } catch (error) {
    console.error(`Failed to append ${filename}:`, error.message);
    console.log(`[log:${filename}] ${line.trimEnd()}`);
    return false;
  }
};

const readLogFile = (filename) => {
  const filePath = getLogFilePath(filename);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Failed to read ${filename}:`, error.message);
    return null;
  }
};

module.exports = {
  appendLogLine,
  getLogFilePath,
  getLogsDir,
  readLogFile
};
