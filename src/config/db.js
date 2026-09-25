const mongoose = require('mongoose');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async (retries = 8, delayMs = 3000) => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/student_accomodation_system_hd';

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(uri);
      console.log(`MongoDB connected: ${mongoose.connection.host}`);
      return;
    } catch (err) {
      console.error(`MongoDB connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) {
        console.error('Giving up on MongoDB connection.');
        process.exit(1);
      }
      await sleep(delayMs);
    }
  }
};

module.exports = connectDB;