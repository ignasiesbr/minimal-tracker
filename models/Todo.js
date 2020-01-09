const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TodoSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },
    text: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: "ACTIVE"
    },
    deadline: {
        type: Date,
    }
}, {timestamps: true});

module.exports = Todo = mongoose.model('todo', TodoSchema);