const app = require('./app');
const config = require('./config/config');

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${config.env} mode on port ${PORT}`);
});

process.on('unhandledRejection', (err) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});

