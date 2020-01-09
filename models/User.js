const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true
    },
    email: {
      type: String,
      required: true,
      unique: true
    },
    password: {
      type: String,
      required: true
    },
    avatar: {
      type: String,
      default: "/static/media/question.3fad7249.svg"
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    notifications: [
      {
        text: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          required: true
        },
        readed: {
          type: Boolean,
          default: false
        },
        date: {
          type: Date,
          default: Date.now
        },
        project: {
          type: String
        },
        issue:String,
        discussionWith: String
      }
    ]
  },
  { timestamps: true }
);

module.exports = User = mongoose.model("user", UserSchema);
