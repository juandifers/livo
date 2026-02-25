const mongoose = require('mongoose');
const config = require('./config');
const { setLastDbConnectMs } = require('../utils/perfState');

let connectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectionPromise) {
    await connectionPromise;
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }
  }

  try {
    const startedAt = Date.now();
    connectionPromise = mongoose.connect(config.mongoURI, {
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 5000
    });
    const conn = await connectionPromise;
    connectionPromise = null;
    setLastDbConnectMs(Date.now() - startedAt);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    connectionPromise = null;
    console.error(`Error: ${error.message}`);
    return null;
  }
};

module.exports = connectDB; 
