const express = require('express');
const router = express.Router();
const {check, validationResult} = require('express-validator');
const auth = require('../middlewares/auth');
const Project = require('../models/Project');
const User = require('../models/User');

// TODO delete project, delete user from project.

const getNewMembers = emails => {
    return Promise.all(
        emails.map(async email => {
            try {
                let foundUser = await User.findOne({email: email});
                return {
                    user: foundUser._id,
                    name: foundUser.name
                }; 
            } 
            catch (error) {
                return null;
            }

            }
        )
    );
};

// @route    POST api/project
// @desc     Create project and add current user as the creator and the first member.
// @access   Private
router.post('/', [auth,
    [
        check('title', 'Title is required').not().isEmpty(),
        check('description', 'Description is required').not().isEmpty(),
        check('end', 'The deadline of the project is required').not().isEmpty()
    ], async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array().map(error => error.msg)})
        };
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(400).json({msg: 'User not found'});
        }
        if (!req.user.isAdmin) {
            return res.status(401).json({msg: 'User not authorized'});
        }
        const {title, description, end} = req.body;
        let newProject = {
            creatorId: req.user.id,
            creatorName: user.name,
            title: title,
            description: description,
            members: [{
                user: req.user.id,
                name: user.name
            }],
            end
        };
        //If the user has inputed members, retrieve those members, remove nulls of the ones that arent in the DB and concat in the
        // newProject object.
        if (req.body.members && req.body.members.length >0 ) {
            let newMembers = await getNewMembers(req.body.members);
            newMembers = newMembers.filter(item => item !== null);
            newProject.members = newProject.members.concat(newMembers);
        }
        if (req.body.start) {
            newProject.start = req.body.start
        };

        const project = new Project(newProject);
        if (user.avatar) {
            project.members.avatar = user.avatar
        };

        try {
            await project.save();
            return res.json(project);
        }
        catch(error) {
            console.error(error.message);
            return res.status(500).json({msg:'Server Error'});
        }
    }]);

// @route    POST api/project/:id_project
// @desc     Add the current loggeed user into the project with id in params
// @access   Private
router.post('/:id', auth, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(400).json({msg: 'This project does not exist'});
        }
        const alreadyInProject = project.members.map(member => member.user).find(element => element == req.user.id);
        if (alreadyInProject) {
            return res.status(400).json({msg: 'This user is already in the project'});
        }
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(400).json({msg: 'User not found'});
        }
        project.members.push({
            user:req.user.id,
            name: user.name
        });
        await project.save();
        return res.json(project);

    } catch (err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    }
});

// @route    POST api/project/:id_project/:user_id
// @desc     Add the selected user into the project
// @access   Private, the user have to be an admin.
router.put('/:project_id/:user_id', auth, async (req, res) => {

    try {
        //Get the selected project or throw
        const project = await Project.findById(req.params.project_id);
        if (!project) {
            return res.status(400).json({msg: 'Project not found'});
        }
        if (!req.user.isAdmin) {
            return res.status(401).json({msg: 'User not authorized'});
        }
        const alreadyInProject = project.members.map(member => member.user).find(element => element == req.params.user_id);
        if (alreadyInProject) {
            return res.status(400).json({msg: 'This user is already in the project'});
        }
        const selectedUser = await User.findById(req.params.user_id);
        if (!selectedUser) {
            return res.status(400).json({msg:'error'});
        }
        project.members.push({
            user: req.params.user_id,
            name: selectedUser.name
        });
        await project.save();
        return res.json(project);
    }
    catch(err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    }

});



// @route    GET api/project
// @desc     Get all projects in which the user is a member
// @access   Private
router.get('/', auth, async (req, res) => {
    try {
        let projects = await Project.find();
        projects = projects.filter(project => project.members.map(members=> members.user).find(element => element == req.user.id));
        return res.json(projects)
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    }
});


// @route    DELETE api/project/:project_id
// @desc     Remove project
// @access   Private
router.delete('/:project_id', auth, async(req, res) => {
    try {
        const project = await Project.findById(req.params.project_id);
        if (!(req.user.id == project.creatorId)) {
            return res.status(401).json({msg: 'User not authorized'});
        }
        await project.remove();
        return res.status(204).json({});

    } catch (err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    }
});

//Issues

// @route    POST api/project/issue/:project_id
// @desc     Create a new issue in the selected project
// @access   Private
router.post('/issue/:project_id', [auth, [
    check('type', 'Type of the issue is a required field').not().isEmpty(),
    check('summary', 'Summary of the issue is a required field').not().isEmpty(),
    check('deadline', 'The deadline date is required').not().isEmpty(),
]], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array().map(error=> error.msg)});
    }
    
    try {
        //Check if the project exisits
        const project = await Project.findById(req.params.project_id);
        if (!project) {
            return res.status(400).json({msg: 'Project not found'});
        }

        //Check if the logged user is part of the target project
        const userInProject = project.members.map(member => member.user).find(member => member == req.user.id);
        if (!userInProject) {
            return res.status(400).json({msg:'Not authorized'});
        }

        const {type, summary, description, deadline} = req.body;
        const issue = {
            autor:req.user.id,
            type,
            summary,
            description,
            deadline
        };
        project.issues.push(issue);
        await project.save();
        return res.json(project);
    }

    catch(err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    }
});

// @route    GET api/project/issue/:project_id
// @desc     Get all issues for a given project id
// @access   Private
router.get('/issue/:project_id', auth, async (req, res) => {
    try {
        const project = await Project.findById(req.params.project_id);
        if (!project) {
            return res.status(400).json({msg: 'Project not found'});
        }

        //Check if the logged user is part of the target project
        const userInProject = project.members.map(member => member.user).find(member => member == req.user.id);
        if (!userInProject) {
            return res.status(400).json({msg:'Not authorized'});
        }

        return res.json(project.issues);

    } catch (err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    }
});

// @route    GET api/project/issue/:project_id/:id_issue
// @desc     GET an issue
// @access   Private
router.get('/issue/:project_id/:issue_id', auth, async (req, res) => {
    try {
        const project = await Project.findById(req.params.project_id);
        if (!project) {
            return res.status(400).json({msg: 'Project not found'});
        }
        const issue = project.issues.find(issue => issue._id == req.params.issue_id);
        if (!issue) {
            return res.status(400).json({msg: 'Issue not found'});
        }
        return res.json(issue);
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    }
});

// @route    PATCH api/project/issue/:project_id/:id_issue
// @desc     Update the status of an issue
// @access   Private
router.patch('/issue/:project_id/:issue_id', auth, async (req, res) => {
    try {
        const project = await Project.findById(req.params.project_id);
        if (!project) {
            return res.status(400).json({msg: 'Project not found'});
        }
        const issue = project.issues.find(issue => issue._id == req.params.issue_id);
        if (!issue) {
            return res.status(400).json({msg: 'Issue not found'});
        }
        issue.status === 'ON_PROGRESS' ? issue.status = 'COMPLETED' : issue.status='ON_PROGRESS'
        await project.save();
        return res.json(project);
    }
    catch(err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});        
    }
});

// @route    POST api/project/issue/:project_id/:issue_id
// @desc     POST a message for the selected issue
// @access   Private
router.post('/:project_id/:issue_id', [auth, 
    [check('text', 'Text is required').not().isEmpty()]] , async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({errors: errors.array().map(error=> error.msg)});
    }
    try {
        const selectedProject = await Project.findById(req.params.project_id);
        if (!selectedProject) {
            return res.status(400).json({msg: 'Project not found'});
        }
        //Check if the req user is member of the project
        const isUser = selectedProject.members.filter(member => {
            if (member.user == req.user.id) {
                return member;
            }
        });
        const user = await User.findById(req.user.id);
        if (isUser.length === 0) {
            return res.status(401).json({msg: 'User is not member of the project'});
        }
        const selectedIssue = selectedProject.issues.filter(issue => issue._id == req.params.issue_id)[0];
        if (!selectedIssue) {
            return res.status(400).json({msg: 'Issue not found'});
        }
        const newMessage = {
            text: req.body.text,
            autor: req.user.id,
            name: user.name,
            avatar: user.avatar
        };
        selectedIssue.messages.push(newMessage);
        await selectedProject.save();
        return res.json(selectedIssue);
    }
    catch(err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});        
    }

});

// @route    DELETE api/project/issue/:project_id/:issue_id
// @desc     DELETE an issue
// @access   Private
router.delete('/issue/:project_id/:issue_id', auth, async(req, res) => {
    try {
        const project = await Project.findById(req.params.project_id);
        const issues = project.issues.filter(issue => issue._id != req.params.issue_id);
        if (!(req.user.id == project.creatorId)) {
            return res.status(401).json({msg: 'User not authorized'});
        }
        project.issues = issues;
        await project.save();
        return res.status(204).json({});
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});        
    }
}); 




module.exports = router;