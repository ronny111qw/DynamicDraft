const express = require('express');
const router = express.Router();
const Application = require('../models/Application')

router.post('/', async (req, res) => {
    const { userId, jobId } = req.body;
    const application = new Application({ userId, jobId});

    try {
        await application.save();
        res.status(201).json(application);
    }  catch (error) {
        res.status(500).json({ message: 'Error saving application'});
    }
});

module.export = router;
