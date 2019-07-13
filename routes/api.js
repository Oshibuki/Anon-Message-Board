/*
 *
 *
 *       Complete the API routing below
 *
 *
 */

'use strict';

var expect = require('chai').expect;
const {
    Thread,
    Reply
} = require("../models/thread");
const mongoose = require("mongoose");
const Joi = require("@hapi/joi");
Joi.objectId = require('joi-objectid')(Joi);


mongoose.connect(process.env.DB, {
    useNewUrlParser: true
});

module.exports = function (app) {

    app.route('/api/threads/:board')
        .post(async (req, res) => {
            // add thread to db
            try {
                let board = req.params.board;
                let schema = {
                    board: Joi.string().min(3).max(15).required(),
                    text: Joi.string().min(1).max(50).required(),
                    delete_password: Joi.string().min(3).max(15).required(),
                };
                let result = Joi.validate({
                    board,
                    ...req.body
                }, schema);
                if (result.error) {
                    return res.send(result.error)
                }
                const {
                    text,
                    delete_password
                } = req.body;
                await Thread.create({
                    board,
                    text,
                    delete_password
                });
                return res.redirect(`/b/${board}`)
            } catch (e) {
                return res.send(e.message)
            }
        })
        .get(async (req, res) => {
            try {
                let board = req.params.board;
                let schema = {
                    board: Joi.string().min(3).max(15).required()
                };
                let result = Joi.validate({
                    board
                }, schema);
                if (result.error) {
                    return res.send(result.error)
                }
                Thread.find({}, "-reported -delete_password")
                    .populate('replies', '-reported -delete_password', null, {
                        sort: {
                            'created_at': -1
                        },
                        limit: 3
                    })
                    .sort({
                        bumped_on: -1
                    })
                    .limit(10)
                    .exec(function (err, threads) {
                        res.json(threads)
                    })
            } catch (e) {
                res.send(e.message)
            }
        })
        .put(async (req, res) => {
            // report a thread and change it's reported value to true
            try {
                let board = req.params.board,
                    thread_id = req.body.thread_id;
                let schema = {
                    thread_id: Joi.objectId().required(),
                    board: Joi.string().min(3).max(15).required()
                };
                let result = Joi.validate({
                    thread_id,
                    board
                }, schema);
                if (result.error) {
                    return res.send(result.error)
                }
                await Thread.findOneAndUpdate({
                    thread_id,
                    board
                }, {
                    $set: {
                        reported: true
                    }
                });
                return res.send("success")
            } catch (e) {
                res.send(e.message)
            }
        })
        .delete(async (req, res) => {
            try {
                let board = req.params.board;
                let schema = {
                    board: Joi.string().min(3).max(15).required(),
                    delete_password: Joi.string().min(3).max(15).required(),
                    thread_id: Joi.objectId().required()
                };
                let result = Joi.validate({
                    board,
                    ...req.body
                }, schema);
                if (result.error) {
                    return res.send(result.error)
                }
                let {
                    delete_password,
                    thread_id
                } = req.body;
                let thread = await Thread.findOne({
                    board,
                    _id: thread_id,
                    delete_password
                });
                if (!thread) {
                    return res.send('incorrect password')
                }
                Thread.findByIdAndDelete(thread_id, (err, result) => {
                    if (err) {
                        throw err
                    } else {
                        return res.send("success")
                    }
                })
            } catch (e) {
                return res.send(e.message)
            }
        });

    app.route('/api/replies/:board')
        .post(async (req, res) => {
            try {
                let board = req.params.board;
                let schema = {
                    board: Joi.string().min(3).max(15).required(),
                    thread_id: Joi.objectId().required(),
                    text: Joi.string().min(1).max(50).required(),
                    delete_password: Joi.string().min(3).max(15).required(),
                };
                let result = Joi.validate({
                    board,
                    ...req.body
                }, schema);
                if (result.error) {
                    return res.send(result.error)
                }
                const {
                    thread_id,
                    text,
                    delete_password
                } = req.body;
                let thread = await Thread.findOne({
                    _id: thread_id,
                    board
                });
                if (!thread) {
                    return res.send("not found")
                }
                let newReply = new Reply({
                    text,
                    delete_password
                });
                thread.replies.push(newReply);
                thread.save(function (err) {
                    if (err) throw err;
                    return res.redirect(`/b/${board}/${thread_id}`)
                });
            } catch (e) {
                return res.send(e.message)
            }
        })
        .get(async (req, res) => {
            //get all data of thread except reported  and password
            try {
                let board = req.params.board,
                    thread_id = req.query.thread_id;
                let schema = {
                    board: Joi.string().min(3).max(15).required(),
                    thread_id: Joi.objectId().required()
                };
                let result = Joi.validate({
                    board,
                    thread_id
                }, schema);
                if (result.error) {
                    return res.send(result.error)
                }
                Thread.findById(thread_id,
                    "-reported -delete_password -__v -replies.reported -replies.delete_password", (err,
                                                                                                   doc) => {
                        if (err) {
                            throw err
                        }
                        if (!doc) {
                            return res.send("not found")
                        }
                        return res.json(doc)
                    })

            } catch (e) {
                return res.send(e.message)
            }
        })
        .put(async (req, res) => {
            //report a reply and change it's reported value to true
            try {
                let schema = {
                    board: Joi.string().min(3).max(15).required(),
                    thread_id: Joi.objectId().required(),
                    reply_id: Joi.objectId().required()
                };
                let result = Joi.validate(req.body, schema);
                if (result.error) {
                    return res.send(result.error)
                }
                let {
                    board,
                    thread_id,
                    reply_id
                } = req.body;
                let thread = await Thread.findOne({
                    thread_id,
                    board
                });
                if (!thread) {
                    return res.send("target thread not found")
                }
                let targetReply = thread.replies.id(reply_id);
                if (!targetReply) {
                    return res.send("targetReply thread not found")
                }
                targetReply.update({
                    reported: true
                });
                thread.save();
                return res.send("success")
            } catch (e) {
                res.send(e.message)
            }
        })
        .delete(async (req, res) => {
            //replace this reply text to  '[deleted]'
            try {
                let board = req.params.board;
                let schema = {
                    delete_password: Joi.string().min(3).max(15).required(),
                    thread_id: Joi.objectId().required(),
                    reply_id: Joi.objectId().required()
                };
                let result = Joi.validate({
                    board,
                    ...req.body
                }, schema);
                if (result.error) {
                    return res.send(result.error)
                }
                let {
                    delete_password,
                    thread_id,
                    reply_id
                } = req.body;
                let thread = await Thread.findOne({
                    thread_id,
                    board
                });
                if (!thread) {
                    return res.send("target thread not found")
                }
                let targetReply = thread.replies.id(reply_id);
                if (!targetReply || (targetReply.delete_password !== delete_password)) {
                    return res.send("incorrect password")
                }
                targetReply.update({
                    text: "[deleted]"
                });
                thread.save();
                return res.send("success")
            } catch (e) {
                res.send(e.message)
            }
        });

};