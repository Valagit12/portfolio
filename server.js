
const express = require('express');
const app = express();

app.set('view engine', 'ejs');

app.get('/', logger, (req, res) => {
    res.render('index', {text: "world"});
});


app.use(express.static('public'));


const resumeRouter = require('./routes/resume');

app.use('/resume', resumeRouter);

// middleware
function logger(req, res, next) {
    console.log(req.originalUrl);
    next();
}

app.listen(3000);