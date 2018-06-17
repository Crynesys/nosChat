const assert = require('assert');
const { isValid } = require('mongoose').Types.ObjectId;

const User = require('../models/user');
const Group = require('../models/group');
const Message = require('../models/message');
const Socket = require('../models/socket');
const xss = require('../../utils/xss');

const FirstTimeMessagesCount = 15;
const EachFetchMessagesCount = 30;

module.exports = {
    async sendMessage(ctx) {
        const { to, type, content } = ctx.data;
        assert(to, 'to Non può essere vuoto');


        let groupId = '';
        let userId = '';
        if (isValid(to)) {
            groupId = to;
            assert(isValid(groupId), 'ID di gruppo non valido');
            const group = await Group.findOne({ _id: to });
            assert(group, 'Il gruppo non esiste');

        } else {
            userId = to.replace(ctx.socket.user, '');
            assert(isValid(userId), 'ID utente non valido');
            const user = await User.findOne({ _id: userId });
            assert(user, 'L\'utente non esiste ');

        }

        let messageContent = content;
        if (type === 'text') {
            assert(messageContent.length <= 2048, 'Messaggio troppo lungo');
            messageContent = xss(content);
        }

        const user = await User.findOne({ _id: ctx.socket.user }, { username: 1, avatar: 1 });
        let message;
        try {
            message = await Message.create({
                from: ctx.socket.user,
                to,
                type,
                content: messageContent,
            });
        } catch (err) {
            throw err;
        }

        const messageData = {
            _id: message._id,
            createTime: message.createTime,
            from: user.toObject(),
            to,
            type,
            content: messageContent,
        };

        if (groupId) {
            ctx.socket.socket.to(groupId).emit('message', messageData);
        } else {
            const sockets = await Socket.find({ user: userId });
            sockets.forEach((socket) => {
                console.log(socket.id);
                ctx._io.to(socket.id).emit('message', messageData);
            });
        }

        return messageData;
    },
    async getLinkmansLastMessages(ctx) {
        const { linkmans } = ctx.data;

        const promises = linkmans.map(linkmanId =>
            Message
                .find(
                    { to: linkmanId },
                    { type: 1, content: 1, from: 1, createTime: 1 },
                    { sort: { createTime: -1 }, limit: FirstTimeMessagesCount },
                )
                .populate('from', { username: 1, avatar: 1 }));
        const results = await Promise.all(promises);
        const messages = linkmans.reduce((result, linkmanId, index) => {
            result[linkmanId] = (results[index] || []).reverse();
            return result;
        }, {});

        return messages;
    },
    async getLinkmanHistoryMessages(ctx) {
        const { linkmanId, existCount } = ctx.data;

        const messages = await Message
            .find(
                { to: linkmanId },
                { type: 1, content: 1, from: 1, createTime: 1 },
                { sort: { createTime: -1 }, limit: EachFetchMessagesCount + existCount },
            )
            .populate('from', { username: 1, avatar: 1 });
        const result = messages.slice(existCount).reverse();
        return result;
    },
    async getDefalutGroupHistoryMessages(ctx) {
        const { existCount } = ctx.data;

        const group = await Group.findOne({ isDefault: true });
        const messages = await Message
            .find(
                { to: group._id },
                { type: 1, content: 1, from: 1, createTime: 1 },
                { sort: { createTime: -1 }, limit: EachFetchMessagesCount + existCount },
            )
            .populate('from', { username: 1, avatar: 1 });
        const result = messages.slice(existCount).reverse();
        return result;
    },
};
