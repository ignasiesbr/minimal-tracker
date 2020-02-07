const express = require("express");
const router = express.Router();
const { check, validationResult } = require("express-validator");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require('../middlewares/auth');
const Project = require('../models/Project');
const Profile = require('../models/Profile');
const sanitizers = require('../utils/sanitize');

require("dotenv").config();

const checkMatch = (pw1, pw2) => pw1 === pw2;
// @route    POST api/users
// @desc     Register user
// @access   Public
router.post(
  "/",
  [
    check("name", "Name is required")
      .not()
      .isEmpty(),
    check("email", "Email is required").isEmail(),
    check(
      "password",
      "Please enter a valid password with 6 or more characters"
    ).isLength({ min: 6 }),
    check("password2", "Please enter a matching password").isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ errors: errors.array().map(error => error.msg) });
    }

    const { password, password2, name, email } = req.body;
    if (!sanitizers.isLegal(password) || !sanitizers.isLegal(email) || !sanitizers.isLegal(name)) {
      return res.status(401).json({msg: 'Enter valid characters'})
    }

    if (!checkMatch(password, password2)) {
      return res.status(400).json({ msg: "Please enter a matching password" });
    }

    try {
      let user = await User.findOne({ email });

      if (user) {
        return res.status(400).json({ msg: "This user already exists" });
      }

      const dataUser = {
        name,
        email,
        password
      };

      if (req.body.isAdmin) dataUser.isAdmin = true;

      user = new User(dataUser);

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      await user.save();
      
      const profile = new Profile({user: user._id});
      await profile.save(); 

      const payload = {
        user: {
          id: user._id,
          isAdmin: true
        }
      };

      jwt.sign(payload, process.env.JWT_SECRET, (err, token) => {
        if (err) {
          throw err;
        }
        return res.json({ token });
      });
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({ msg: "Server Error" });
    }
  }
);

// @route    PATCH api/users/
// @desc     Update user
// @access   Private
router.patch('/', [auth, check('avatar', 'Avatar is required').not().isEmpty()], async(req, res ) => {
  const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ errors: errors.array().map(error => error.msg) });
    }
  try {
    const user = await User.findById(req.user.id).select('-password');
    if(!user) {
      return res.stauts(400).json({msg: 'user not found'});
    }
    user.avatar = req.body.avatar;
    await user.save();
    return res.json(user);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "Server Error" });
  }
});


// @route    GET api/users
// @desc     Get users with the supplied email
// @access   Private
router.post('/email', [auth, [
  check('email', 'Write an email to invite').isEmail()
]], async (req, res) => {
  try {
    const user = await User.findOne({email:req.body.email}).select(['-password', '-isAdmin']);
    return res.json(user);
  }
  catch(err) {
    console.error(err.message);
    return res.status(500).json({ msg: "Server Error" });
  }
});
// @route    DELETE api/users
// @desc     Delete the user
// @access   Private
router.delete('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const profile = await Profile.findOne({user:req.user.id});
    let projects = await Project.find();
    projects =  projects.filter(project => project.members.map(members=> members.user).find(element => element == req.user.id));

    //Delete the user for the projects.
    projects = projects.filter(async project => {
        project.members = project.members.filter(member => member.user != req.user.id);
        if (project.members.length > 0 ) {
          if (project.creatorId == req.user.id) {
            const newAdmin = await User.findById(project.members[0].user);
            if (!newAdmin.isAdmin) {
              newAdmin.isAdmin = true;
            }
            project.creatorId = newAdmin._id;
            project.creatorName = newAdmin.name;
          }
          await project.save();
          return project
        }
        else {
          await project.remove();
        }
    });

    await user.remove();
    await profile.remove();
    return res.status(204).json({})
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "Server Error" });
  }
});

// @route    POST api/users/notifications
// @desc     Post a notification
// @access   Private
router.post('/notifications', [auth, [
  check('text', 'Text of the notification is required').not().isEmpty(),
  check('type', 'Type of the notification is required').not().isEmpty(),
]], async(req,res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map(error => error.msg) });
  }

  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(400).json({msg:'User not found'});
    }
    let newNotification = {
      text: req.body.text,
      type: req.body.type
    };
    newNotification.text = sanitizers.sanitize(newNotification.text);
    newNotification.type = sanitizers.sanitize(newNotification.type);
    user.notifications.unshift(newNotification);
    await user.save();
    return res.json(user.notifications[0]);
  }
  catch(err) {
    console.error(err.message);
    return res.status(500).json({ msg: "Server Error" });
  }
});


// @route    PATCH api/users/notifications/:notification_id
// @desc     Update a notification status (readed)
// @access   Private
router.patch('/notifications/:id', auth, async (req, res) => {

  try {
    console.log('readin');
    const user = await User.findById(req.user.id);
    const notification = user.notifications.filter(notification => notification._id == req.params.id)[0];
    if (!notification) {
      return res.status(400).json({msg: 'Notification not found'});
    }
    notification.readed = !notification.readed;
    await user.save();
    return res.json(notification);

  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "Server Error" });
  }
});


// @route    DELETE api/users/notifications/:notification_id
// @desc     Delete a notification
// @access   Private
router.delete('/notifications/:id', auth, async (req, res) => {

  try {

    const user = await User.findById(req.user.id);
    const notifications = user.notifications.filter(notification => notification._id != req.params.id);
    if (!notifications) {
      return res.status(400).json({msg: 'Notification not found'});
    }
    user.notifications = notifications;
    await user.save();
    return res.status(204).json({});

  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ msg: "Server Error" });
  }
});


// @route    POST api/users/notifications/:user_id
// @desc     Post a notification in the given user via params
// @access   Private
router.post('/notifications/:id', [auth, [
  check('text', 'Text of the notification is required').not().isEmpty(),
  check('type', 'Type of the notification is required').not().isEmpty(),
]], async(req,res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map(error => error.msg) });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(400).json({msg:'User not found'});
    }
    let newNotification = {
      text: req.body.text,
      type: req.body.type,
    };
    if (req.body.project) {
      newNotification.project = sanitizers.sanitize(req.body.project);
    }
    if (req.body.discussionWith) {
      newNotification.discussionWith = sanitizers.sanitize(req.body.discussionWith);
    }
    newNotification.text = sanitizers.sanitize(newNotification.text);
    newNotification.type = sanitizers.sanitize(newNotification.type);
    user.notifications.unshift(newNotification);
    await user.save();
    return res.json(user.notifications[0]);
  }
  catch(err) {
    console.error(err.message);
    return res.status(500).json({ msg: "Server Error" });
  }
});

const sendNotification = async (members, notification) => {
  try {
    members.forEach(async member => {
      let user = await User.findById(member);
      user.notifications.unshift(notification);
      await user.save();
    });
    return null;
  } catch (error) {
    return error;
  }
}

// @route    PUT api/users/notifications/:project_id/:issue_id
// @desc     PUT a notification in the given users in the issue
// @access   Private
router.put('/notifications/project/:project_id/', [auth, [
  check('text', 'Text of the notification is required').not().isEmpty(),
  check('type', 'Type of the notification is required').not().isEmpty(),
  check('issue', 'Issue of the notification is required').not().isEmpty(),]], 
async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array().map(error => error.msg) });
  }

  try {
    const selectedProject = await Project.findById(req.params.project_id);
    if (!selectedProject) {
      return res.status(400).json({msg: 'Project not found'});
    }
    const members = selectedProject.members.map(member => member.user).filter(member => member != req.user.id);
    const newNotification = {
      text: sanitizers.sanitize(req.body.text),
      type: sanitizers.sanitize(req.body.type),
      issue: sanitizers.sanitize(req.body.issue),
    };
    await sendNotification(members, newNotification);
    return res.status(200).json({});
  } catch (err) {
      console.error(err.message);
      return res.status(500).json({ msg: "Server Error" });
  }
});


module.exports = router;