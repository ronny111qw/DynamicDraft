const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/', async (req , res) => {
    const { title, location} = req.query;
    try {
        const response = await axios.get('Api call')
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching jobs'});
    }
});

module.exports = router;