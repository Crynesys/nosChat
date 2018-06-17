const assert = require('assert');
const bluebird = require('bluebird');
const bcrypt = bluebird.promisifyAll(require('bcrypt'), { suffix: '$' });
const jwt = require('jwt-simple');
const { isValid } = require('mongoose').Types.ObjectId;

const User = require('../models/user');
const Group = require('../models/group');
const Socket = require('../models/socket');
const Friend = require('../models/friend');
const Message = require('../models/message');
const config = require('../../config/server');
const getRandomAvatar = require('../../utils/getRandomAvatar');

const saltRounds = 10;

function generateToken(user, environment) {
    return jwt.encode(
        {
            user,
            environment,
            expires: Date.now() + config.tokenExpiresTime,
        },
        config.jwtSecret,
    );
}

module.exports = {

    async register(ctx) {
        const {
            username, password, neoAddress, os, browser, environment,

        } = ctx.data;
        assert(username, 'Il nome utente non può essere vuoto');
        assert(password, 'La password non può essere vuota');

        const user = await User.findOne({ username });
        assert(!user, 'Il nome utente esiste già');

        const defaultGroup = await Group.findOne({ isDefault: true });
        assert(defaultGroup, 'Il gruppo predefinito non esiste');

        const salt = await bcrypt.genSalt$(saltRounds);
        const hash = await bcrypt.hash$(password, salt);

        let newUser = null;
        try {
            newUser = await User.create({
                username,
                salt,
                password: hash,
                avatar: getRandomAvatar(),
                groups: [defaultGroup],
                neoAddress,
            });
        } catch (err) {
            if (err.name === 'ValidationError') {
                return 'Il nome utente contiene caratteri non supportati o la lunghezza supera il limite';
            }
            throw err;
        }

        defaultGroup.members.push(newUser);
        await defaultGroup.save();

        const token = generateToken(newUser._id, environment);

        ctx.socket.user = newUser._id;
        await Socket.update({ id: ctx.socket.id }, {
            user: newUser._id,
            os,
            browser,
            environment,
        });

        return {
            _id: newUser._id,
            avatar: newUser.avatar,
            username: newUser.username,
            groups: [{
                _id: defaultGroup._id,
                name: defaultGroup.name,
                avatar: defaultGroup.avatar,
                creator: defaultGroup.creator,
                createTime: defaultGroup.createTime,
                messages: [],
            }],
            friends: [],
            token,
        };
    },
    async login(ctx) {
        const {
            username, password, os, browser, environment,
        } = ctx.data;
        assert(username, 'Il nome utente non può essere vuoto');
        assert(password, 'La password non può essere vuota');

        const user = await User.findOne({ username });
        assert(user, 'L\'utente non esiste ');


        const isPasswordCorrect = bcrypt.compareSync(password, user.password);
        assert(isPasswordCorrect, 'Password errata');

        user.lastLoginTime = Date.now();
        await user.save();

        const groups = await Group.find({ members: user }, {
            _id: 1, name: 1, avatar: 1, creator: 1, createTime: 1,
        });
        groups.forEach((group) => {
            ctx.socket.socket.join(group._id);
            return group;
        });

        const friends = await Friend
            .find({ from: user._id })
            .populate('to', { avatar: 1, username: 1 });

        const token = generateToken(user._id, environment);

        ctx.socket.user = user._id;
        await Socket.update({ id: ctx.socket.id }, {
            user: user._id,
            os,
            browser,
            environment,
        });

        return {
            _id: user._id,
            avatar: user.avatar,
            username: user.username,
            groups,
            friends,
            token,
            neoAddress: user.neoAddress,
        };
    },
    async loginByToken(ctx) {
        const {
            token, os, browser, environment,
        } = ctx.data;
        assert(token, 'Il token non può essere vuoto');

        let payload = null;
        try {
            payload = jwt.decode(token, config.jwtSecret);
        } catch (err) {
            return 'Token illegale';
        }

        assert(Date.now() < payload.expires, 'Token scaduto');
        assert.equal(environment, payload.environment, 'Accesso illegale');

        const user = await User.findOne({ _id: payload.user }, { _id: 1, avatar: 1, username: 1 });
        assert(user, 'L\'utente non esiste ');


        user.lastLoginTime = Date.now();
        await user.save();

        const groups = await Group.find({ members: user }, { _id: 1, name: 1, avatar: 1, creator: 1, createTime: 1 });
        groups.forEach((group) => {
            ctx.socket.socket.join(group._id);
            return group;
        });

        const friends = await Friend
            .find({ from: user._id })
            .populate('to', { avatar: 1, username: 1 });

        ctx.socket.user = user._id;
        await Socket.update({ id: ctx.socket.id }, {
            user: user._id,
            os,
            browser,
            environment,
        });

        return {
            _id: user._id,
            avatar: user.avatar,
            username: user.username,
            groups,
            friends,
        };
    },
    async guest(ctx) {
        const { os, browser, environment } = ctx.data;

        await Socket.update({ id: ctx.socket.id }, {
            os,
            browser,
            environment,
        });

        const group = await Group.findOne({ isDefault: true }, { _id: 1, name: 1, avatar: 1, createTime: 1 });
        ctx.socket.socket.join(group._id);

        const messages = await Message
            .find(
                { to: group._id },
                { type: 1, content: 1, from: 1, createTime: 1 },
                { sort: { createTime: -1 }, limit: 15 },
            )
            .populate('from', { username: 1, avatar: 1 });
        messages.reverse();

        return Object.assign({ messages }, group.toObject());
    },
    async changeAvatar(ctx) {
        const { avatar } = ctx.data;
        assert(avatar, 'Il nuovo collegamento avatar non può essere vuoto');

        await User.update({ _id: ctx.socket.user }, {
            avatar,
        });

        return {};
    },
    async addFriend(ctx) {
        const { userId } = ctx.data;
        assert(isValid(userId), 'ID utente non valido');

        const user = await User.findOne({ _id: userId });
        assert(user, 'Impossibile aggiungere l\'amico, l\'utente non esiste');


        const friend = await Friend.find({ from: ctx.socket.user, to: user._id });
        assert(friend.length === 0, 'Sei già amico');

        const newFriend = await Friend.create({
            from: ctx.socket.user,
            to: user._id,
        });

        return {
            _id: user._id,
            username: user.username,
            avatar: user.avatar,
            from: newFriend.from,
            to: newFriend.to,
        };
    },
    async deleteFriend(ctx) {
        const { userId } = ctx.data;
        assert(isValid(userId), 'ID utente non valido');

        const user = await User.findOne({ _id: userId });
        assert(user, 'L\'utente non esite');

        await Friend.remove({ from: ctx.socket.user, to: user._id });
        return {};
    },
};
