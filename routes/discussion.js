const express = require('express');
const router = express.Router();
const {check, validationResult} = require('express-validator');
const PersonalDiscussion = require('../models/PersonalDiscussion');
const User = require('../models/User');
const auth = require('../middlewares/auth');

// @route    GET api/discussion/:id
// @desc     GET a discussion between two members
// @access   Private
router.post('/:id', auth, async (req,res) => {
    try {
        if (req.params.id == req.user.id) {
            throw Error("Same user")
        }
        const disc1 = await PersonalDiscussion.find({member1:req.user.id});
        const disc2 = await PersonalDiscussion.find({member2:req.user.id});
        const allDiscussions = disc1.concat(disc2);

        //check if the user of the params is already in any of the discussions of the user.
        const discussionBoth = allDiscussions.filter(discussion => {
            if (discussion.member1 == req.params.id || discussion.member2 == req.params.id) {
                return discussion
            }    
        });

        if (discussionBoth.length > 0) {
            return res.json(discussionBoth[0])
        }

        const newDiscussion = {
            member1: req.user.id,
            member2: req.params.id,
        };

        const discussion = new PersonalDiscussion(newDiscussion);
        await discussion.save()
        return res.json(discussion);
    }
    catch(err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    }

});

// @route    POST api/discussion/:id
// @desc     Post a message in the discussion id params
// @access   Private
router.post('/message/:id', [auth, [check('text', 'Text is required').not().isEmpty()]], async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array().map(error=> error.msg)});
    }

    try {
        const currentDiscussion = await PersonalDiscussion.findById(req.params.id);

        //Check if the request user is part of the discussion
        if (!(req.user.id == currentDiscussion.member1 || req.user.id == currentDiscussion.member2)) {
            return res.status(401).json({msg: 'Not authorized to post in this discussion'});
        };
        const user = await User.findById(req.user.id);
        if(!user) {
            return res.status(400).json({msg:'error, user not found'});
        }
        const newMessage = ({
            autor: req.user.id,
            text:req.body.text,
            name: user.name,
            avatar: user.avatar
        });
        currentDiscussion.messages.push(newMessage);
        await currentDiscussion.save();
        return res.json(currentDiscussion);
    }
    catch(err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    }
})

module.exports = router;