const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const IssueSchema = new Schema({
    createdBy: {
        type: Schema.Types.ObjectId,
        ref:'user',
    },
    project : {
        type: Schema.Types.ObjectId,
        ref: 'project'
    },
    type: {
        type: String,
        required: true
    },
    summary: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        default: "ON_PROGRESS"
    },
    deadline: {
        type: Date,
        required: true
    },
    messages: [
        {
            text: {
                type: String,
                required: true
            },
            autor: {
                type: Schema.Types.ObjectId,
                ref: 'user'
            },
            date: {
                type: Date,
                default: Date.now
            }
        }
    ]
}, {timestamps:true});

module.exports = Issue = mongoose.model('issue', IssueSchema);