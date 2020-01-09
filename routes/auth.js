const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { check, validationResult } = require("express-validator");
const auth = require('../middlewares/auth');
const User = require("../models/User");
const sanitizers = require('../utils/sanitize');
require("dotenv").config();

// @route    POST api/auth
// @desc     Login user
// @access   Public
router.post(
  "/",
  [
    check("email", "You must write an email").isEmail(),
    check("password", "Introduce a valid password").isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ errors: errors.array().map(error => error.msg) });
    }

    let { email, password } = req.body;
    email = sanitizers.sanitize(email);
    if (!sanitizers.isLegal(password)) {
      return res.status(401).json({msg: 'Password is not valid'});
    }

    try {
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(401).json({ msg: "Invalid Credentials" });
      }

      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(400).json({ msg: "Invalid Credentials" });
      }

      const payload = {
        user: {
          id: user.id,
          isAdmin: user.isAdmin
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: 360000 },
        (err, token) => {
          if (err) throw err;
          return res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      return res.status(500).json({ msg: "Server Error" });
    }
  }
);

// @route    GET api/auth
// @desc     Get user
// @access   Private
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    return res.json(user);
  }
  catch(err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/forgot-password', [check('email', 'Email is necessary').isEmail()], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res
        .status(400)
        .json({ errors: errors.array().map(error => error.msg) });
    }
    const user = await User.findOne({email: req.body.email});
    if (!user) {
      return res.status(400).json({msg:'User not found'});
    }
    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000;
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: `${process.env.EMAIL_ADDRESS}`,
        pass: `${process.env.EMAIL_PASSWORD}`,
      },
    });

    const mailOptions = {
      from: `${process.env.EMAIL_ADDRESS}`,
      to: `${user.email}`,
      subject: 'Link to reset password',
      text:
        `You are receiving this because you (or someone else) have requested the reset of the password for your account. \n\n` + 
        'Please click in the following link, or paste this into your browser to complete the process within an hour of receiving it: \n\n' +
        `http://localhost:3000/reset/${token}\n\n` + 
        'If you did not request this, please ignore this email and your password will remain unchanged\n'
    };

    transporter.sendMail(mailOptions, async (err, response) => {
      if (err) {
        console.error('there was an error', err);
      }
      else {
        await user.save();
        return res.status(200).json('recovery email sent');
      }
    })

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/reset/:token', async (req, res) => {
  try {
    const user = await User.findOne({resetPasswordToken:req.params.token});
    if (!user || (new Date(user.resetPasswordExpires).getTime() < Date.now())) {
      return res.status(400).json({msg:'Invalid token'});
    }
    return res.status(200).send({
      username: user.email,
      message: 'password reset link a-ok',
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');    
  }
});

router.put('/updatePasswordViaEmail/:token', async(req, res) => {
  try {
    const user = await User.findOne({resetPasswordToken:req.params.token});
    if (!user || (new Date(user.resetPasswordExpires).getTime() < Date.now())) {
      return res.status(400).json({msg:'Invalid token'});
    }
    if (user.email != req.body.email) {
      return res.status(400).json({msg: 'something went wrong'});
    }
    const SALT_ROUNDS = 10;
    bcrypt.hash(req.body.password, SALT_ROUNDS)
    .then(hashedPassword => {
      user.password = hashedPassword;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      user.save()
    })
    .then(() => {
      return res.status(200).json({msg: 'password updated'});
    })

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');    
  }
})


module.exports = router;
