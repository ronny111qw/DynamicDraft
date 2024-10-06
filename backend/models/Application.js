const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    userId: { type: String, required: true},
    jobId: { type: String, required: true},
    status: { type: String, default: 'Applied'},
    appliedAt: { type: Date, default: Date.now},

});

module.exports = mongoose.model('Application', applicationSchema);
