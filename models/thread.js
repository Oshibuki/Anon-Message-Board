const mongoose = require("mongoose");

var replySchema = new mongoose.Schema({
    text: {
        type: String,
        minlength: 1,
        maxlength: 50,
        required: true,
    },
    reported: {
        type: Boolean,
        required: true,
        default: false
    },
    delete_password: {
        type: String,
        minlength: 3,
        maxlength: 15,
        required: true,
    }
}, {timestamps: {createdAt: "created_on"}});

var Reply = new mongoose.model("reply", replySchema);

var threadSchema = new mongoose.Schema({
    board: {
        type: String,
        minlength: 3,
        maxlength: 15,
        required: true,
    },
    text: {
        type: String,
        minlength: 1,
        maxlength: 50,
        required: true,
    },
    delete_password: {
        type: String,
        minlength: 3,
        maxlength: 15,
        required: true,
    },
    reported: {
        type: Boolean,
        required: true,
        default: false
    },
    replies: [replySchema]
}, {timestamps: {createdAt: 'created_on', updatedAt: 'bumped_on'}});


var Thread = new mongoose.model("thread", threadSchema);

module.exports = {
    Thread, Reply
};