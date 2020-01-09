const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
    creatorName: {
        type: String,
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    start: {
        type: Date,
        default: Date.now
    },
    end: {
        type: Date,
        required: true
    },
    members: [
        {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'users'
        },
        name: {
            type: String,
            required: true
        },
        avatar:{
            type: String, 
        }
    }
    ],
    issues: [
        {
            autor: {
                type: mongoose.Schema.Types.ObjectId,
                ref:'user',
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
            creationDate: {
                type: Date,
                default: Date.now
            },
            deadline: {
                type: Date
            },
            messages: [
                {
                    text: {
                        type: String,
                        required: true
                    },
                    autor: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'user'
                    },
                    date: {
                        type: Date,
                        default: Date.now
                    },
                    name: {
                        type:String,
                        required: true
                    },
                    avatar:{
                        type: String
                    }
                }
            ]
        }
    ]

});

module.exports = Project = mongoose.model('project', ProjectSchema);
