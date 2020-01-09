const express = require('express');
const router = express.Router();
const {check, validationResult} = require('express-validator');
const Issue = require('../models/Issue');
const Project = require('../models/Project');
const auth = require('../middlewares/auth');

// @route    POST api/issues/:project_id
// @desc     Post an issue
// @access   Private
router.post('/:id', [auth, [
    check('type', 'Type of the issue is a required field').not().isEmpty(),
    check('summary', 'Summary of the issue is a required field').not().isEmpty()
]], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array().map(error=> error.msg)});
    }
        try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(400).json({msg: 'Project not found'});
        }

        const {type, summary, description} = req.body;
        const newIssue = new Issue({
            type,
            summary,
            description,
            createdBy: req.user.id,
            project: req.params.id
        });

        await newIssue.save();
        return res.json(newIssue)
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({msg:'Server Error'});
    }
});


// @route    Get api/issues/:id_project
// @desc     Get all issues for a certain project
// @access   Private
router.get('/:id', auth, async (req, res) => {
    const issues = await Issue.find({project: req.params.id});
    if (!issues) {
        return res.status(400).json({msg: 'No issues found for this project'});
    }
    return res.json(issues);

});

// @route    PATCH api/issues/:id_issue
// @desc     Update the status of an issue
// @access   Private
router.patch('/:id_issue', [auth, [
    check('status', 'Status is required').not().isEmpty()
]], async (req, res) => {
    try {   
        const issue = await Issue.findById(req.params.id_issue);
        if (!issue) {
            return res.status(400).json({msg:'No issue found'});
        }
        const project = await Project.findById(issue.project);
        const userInProject = project.members.map(member => member.user).find(member => member == req.user.id);
        if (!userInProject) {
            return res.status(400).json({msg:'Not authorized'});
        }
        
        issue.status = req.body.status;
        return res.json(issue);
    }
    catch(err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    }
});

module.exports = router;