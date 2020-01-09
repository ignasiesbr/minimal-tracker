const mongoose = require("mongoose");

const ProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  },
  role: {
    type: String,
    default: "Not defined yet"
  },
  location: {
    type: String,
    default: "Not defined yet"
  },
  bio: {
    type: String,
    default: "Not defined yet"
  }
});

module.exports = Profile = mongoose.model("profile", ProfileSchema);
