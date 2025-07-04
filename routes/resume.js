const express = require('express');
const resumeRouter = express.Router();

resumeRouter.get('/', (req, res) => {
    res.download('public/img/resume.pdf', 'Valareza_Arezehgar_Resume.pdf', (err) => {
        if (err) {
            console.error("Download error: ", err);
            res.status(500).send("Failed to download resume.");
        }
    })
})

module.exports = resumeRouter;

