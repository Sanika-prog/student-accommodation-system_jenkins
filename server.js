require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

/* istanbul ignore next */
const start = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

/* istanbul ignore next */
if (require.main === module) {
  start();
}

module.exports = app;
