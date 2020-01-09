const express = require("express");
const dotenv = require("dotenv").config();
const connectDB = require("./config/db");

const app = express();
app.use(express.json());
// Connect to DB
connectDB();

//Routes
app.use("/api/users", require("./routes/users"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/profile", require('./routes/profile'));
app.use("/api/project", require('./routes/project'));
app.use("/api/todos", require('./routes/todos'));
app.use('/api/discussion', require('./routes/discussion'));

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server started! Port:${port}`));
