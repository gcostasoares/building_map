// scripts/seedBuildings.js
require('dotenv').config();
const mongoose = require('mongoose');
const Building = require('../models/Building');
const rawData  = require('../data/buildings.json');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  await Building.deleteMany({});
  console.log('🗑  Cleared buildings collection');

  const inserted = await Building.insertMany(rawData);
  console.log(`🚀 Seeded ${inserted.length} buildings`);

  await mongoose.disconnect();
  console.log('👋 Disconnected');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
