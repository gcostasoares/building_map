const mongoose = require('mongoose');

const buildingSchema = new mongoose.Schema({
  name:              { type: String, required: true },
  peopleCount:       Number,
  occupied:          Boolean,
  yearBuilt:         Number,
  address:           String,
  imageUrl:          String,
  hasGarage:         Boolean,
  hasBalcony:        Boolean,
  lastRenovationYear:Number,
  owner:             String,
  solarEnergy:       Boolean,
  hasLift:           Boolean,
  floors:            Number,
  needRepair:        Boolean,
}, { timestamps: true });

module.exports = mongoose.model('Building', buildingSchema);