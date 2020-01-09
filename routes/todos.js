const express = require('express');
const {check, validationResult} = require('express-validator');
const Todo = require('../models/Todo');
const auth = require('../middlewares/auth');
const sanitizers = require('../utils/sanitize');

const router = express.Router();

// @route    POST api/todos
// @desc     Create a todo
// @access   Private
router.post("/", [auth, [
    check('text', 'Text is required').not().isEmpty()
]], async (req, res) => {
    try{
        const todo = new Todo({
            user: sanitizers.sanitize(req.user.id),
            text: sanitizers.sanitize(req.body.text)
        });

        if (req.body.deadline) {
            let date = new Date(req.body.deadline);
            if (isNaN(date.getTime())) {
                throw Error('Invalid Date')
            }
            else {
                todo.deadline = req.body.deadline;
            }
        }
        await todo.save();
        return res.json(todo);
    }
    catch(err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    }
});

// @route    GET api/todos
// @desc     Get all todos of the logged user
// @access   Private
router.get('/', auth, async (req, res) => {
    try {
        const todos = await Todo.find({user: req.user.id});
        return res.json(todos);
    }
    catch(err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    }
});

// @route    GET api/todos/:todo_id
// @desc     Get the selected todo
// @access   Private
router.get('/:id', auth, async(req, res) => {
    try {
        const todo = await Todo.findById(req.params.id);
        if (!todo) {
            return res.status(404).json({msg: 'Todo not found'});
        }
        return res.json(todo);
    }
    catch(err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    }
});

// @route    GET api/todos/filter/:filter
// @desc     Get the filtered todos for the logged user.
// @access   Private
router.get('/filter/:filter', auth, async (req, res) => {
    try {
        let todos = await Todo.find({user:req.user.id});
        if (req.params.filter === "ALL") {
            return res.json(todos);
        }
        todos = todos.filter(todo => todo.status === req.params.filter);
        return res.json(todos);

    } catch (err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    };
});


// @route    PATCH api/todos/:todo_id
// @desc     Upadte state of the todo
// @access   Private
router.patch('/:todo_id', [auth, [
    check('status', 'Status is required').not().isEmpty()
]], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({errors: errors.array().map(error => error.msg)});
        }
        const todo = await Todo.findById(req.params.todo_id);
        if (!todo) {
            return res.status(400).json({msg: 'Todo cannot be found'});
        }
        todo.status = sanitizers.sanitize(req.body.status);
        await todo.save();
        return res.json(todo);
    } catch (err) {
        console.error(err.message);
        return res.status(500).json({msg:'Server Error'});
    }
});

// @route    DELETE api/todos/:todo_id
// @desc     Delete the todo with :todo_id
// @access   Private
router.delete('/:todo_id', auth, async(req, res) => {
    try {
        const todo = await Todo.findById(req.params.todo_id);
        await todo.remove();
        return res.status(204).json({});
    }
    catch(err) {
        console.error(err.message);
        return res.status(500).json({msg: 'Server Error'});
    }
});




module.exports = router;