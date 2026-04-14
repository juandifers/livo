const fs = require('fs');
const os = require('os');
const path = require('path');

describe('logFiles', () => {
  const originalEnv = {
    LOG_DIR: process.env.LOG_DIR,
    VERCEL: process.env.VERCEL,
    AWS_LAMBDA_FUNCTION_NAME: process.env.AWS_LAMBDA_FUNCTION_NAME,
    LAMBDA_TASK_ROOT: process.env.LAMBDA_TASK_ROOT
  };

  afterEach(() => {
    jest.resetModules();

    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  test('uses LOG_DIR when provided', () => {
    const customDir = path.join(os.tmpdir(), `livo-log-test-${Date.now()}-custom`);
    process.env.LOG_DIR = customDir;
    delete process.env.VERCEL;

    const { getLogsDir } = require('../../src/utils/logFiles');

    expect(getLogsDir()).toBe(customDir);
  });

  test('uses a temp directory in serverless environments', () => {
    delete process.env.LOG_DIR;
    process.env.VERCEL = '1';

    const { getLogsDir } = require('../../src/utils/logFiles');

    expect(getLogsDir()).toBe(path.join(process.env.TMPDIR || os.tmpdir(), 'livo-logs'));
  });

  test('appends and reads logs from the resolved directory', () => {
    const customDir = path.join(os.tmpdir(), `livo-log-test-${Date.now()}-append`);
    process.env.LOG_DIR = customDir;
    delete process.env.VERCEL;

    const { appendLogLine, getLogFilePath, readLogFile } = require('../../src/utils/logFiles');

    expect(appendLogLine('sample.log', 'hello\n')).toBe(true);
    expect(fs.existsSync(getLogFilePath('sample.log'))).toBe(true);
    expect(readLogFile('sample.log')).toBe('hello\n');
  });
});
