const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const DiscussionSchema = new Schema({
    member1: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required:true
    },
    
    member2: {
        type: Schema.Types.ObjectId,
        ref: 'user',
        required:true
    },
    messages: [
        {
            text: {
                type: String,
                required: true
            },
            date: {
                type: Date,
                default: Date.now
            },
            autor: {
                type: Schema.Types.ObjectId,
                ref: 'user',
                required: true
            },
            name: {
                type:String,
                required:true
            },
            avatar:String
        }
    ]
})

module.exports = PersonalDiscussion = mongoose.model('discussion', DiscussionSchema);