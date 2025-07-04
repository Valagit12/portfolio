const express = require('express');
const app = express.Router();

app.get('/', (req, res) => {
    res.send('User List');
});

app.get('/new', (req, res) => {
    res.send('User New Form');
});

// Has to come after all the other ones because of the dynamic parameters
app.route("/:id").get((req, res) => {
    res.send(`Get User with ID ${req.params.id}`);
    console.log(req.user);
})
.put((req, res) => {
    res.send('some stuff');
}).delete((req, res) => {
    res.send('does some other stuff');
})

const users = [{name: "Kyle"}];
// middleware, runs between request being sent to server and response to user
app.param("id", (req, res, next, id) => {
    req.user = users[id];
    next()
})



module.exports = app;