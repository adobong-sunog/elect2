const app = require('./app');
const { init } = require('./db');
const { ensureAdminSeed } = require('./services/auth/userService');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await init();
    await ensureAdminSeed();
    app.listen(PORT, () => {
      console.info(`Server listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize application.', error);
    process.exit(1);
  }
}

start();
