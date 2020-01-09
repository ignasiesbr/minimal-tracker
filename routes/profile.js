const router = require("express").Router();
require("dotenv").config();
const auth = require("../middlewares/auth");
const Profile = require('../models/Profile');

// @route    GET api/profile/me
// @desc     Get current user profile
// @access   Private
router.get("/me", auth, async (req, res) => {
    try {
        const profile = await Profile.findOne({user: req.user.id}).populate('user', ['name', 'avatar']);
        
        if(!profile) {
            return res.status(400).json({msg: 'There is no profile for this user'});
        }

        return res.json(profile);
    }
    catch(err) {
        console.error(err.message);
        return res.status(500).send('Server Error');
    };
});

// @route    POST api/profile/
// @desc     Update Profile
// @access   Private
router.post('/', auth, async (req, res) => {
    const {role, location, bio} = req.body;

    const profileFields = {};

    if (role.length > 0) profileFields.role = role;
    if (location.length > 0) profileFields.location = location;
    if (bio.length > 0) profileFields.bio = bio;

    try {
        let profile = await Profile.findOneAndUpdate(
           {user: req.user.id},
           {$set: profileFields},
           {new: true, upsert:true}
        );
        return res.json(profile);
    }
    catch(err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    };

});

// @route    GET api/profile/
// @desc     Get all profiles
// @access   Private
router.get('/', auth, async (req, res) => {
    try {
        const profiles = await Profile.find().populate('user', ['name', 'avatar']);
        if (!profiles) {
            return res.status(400).json({msg:'Couldnt retrieve profiles'});
        };
        return res.json(profiles);

    } catch (err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    };
});

// @route    DELETE api/profile/
// @desc     Delete Profile, 
// @access   Private


// @route    GET api/profile/:_id
// @desc     Get profile by id
// @access   Private
router.get('/:id', auth, async (req, res) => {
    try {
        const profiles = await Profile.find().populate('user', ['name', 'avatar', 'email']);
        const profile = profiles.find(profile => profile.user._id == req.params.id);
        if (!profile) {
            return res.status(400).json({msg:'Profile not found'});
        }
        return res.json(profile);
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    }
});

module.exports = router;