const assert = require('assert');
const bluebird = require('bluebird');
const bcrypt = bluebird.promisifyAll(require('bcrypt'), { suffix: '$' });
const jwt = require('jwt-simple');
const { isValid } = require('mongoose').Types.ObjectId;

const User = require('../models/user');
const Transaction = require('../models/transaction');
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
        assert(username, 'User name can not be void');
        assert(password, 'The user password can not be void');

        const user = await User.findOne({ username });
        assert(!user, 'User name already exists');

        const defaultGroup = await Group.findOne({ isDefault: true });
        assert(defaultGroup, 'Default group does not exists');

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
                return 'User name is not valid or too long';
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
        assert(!ctx.socket.user, 'You are already in');

        const {
            username, password, os, browser, environment,
        } = ctx.data;
        assert(username, 'User name can not be void');
        assert(password, 'The user password can not be void');

        const user = await User.findOne({ username });
        assert(user, 'The user does not exist ');


        const isPasswordCorrect = bcrypt.compareSync(password, user.password);
        assert(isPasswordCorrect, 'Wrong Password');

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
            .populate('to', { avatar: 1, username: 1, neoAddress: 1 });

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
        assert(!ctx.socket.user, 'You are already in');

        const {
            token, os, browser, environment,
        } = ctx.data;
        assert(token, 'Token can not be void');

        let payload = null;
        try {
            payload = jwt.decode(token, config.jwtSecret);
        } catch (err) {
            return 'Illegal Token';
        }

        assert(Date.now() < payload.expires, 'Token expaired');
        assert.equal(environment, payload.environment, 'Illegal Access');

        const user = await User.findOne({ _id: payload.user }, { _id: 1, avatar: 1, username: 1, neoAddress: 1 });
        assert(user, 'The user does not exist ');


        user.lastLoginTime = Date.now();
        await user.save();

        const groups = await Group.find({ members: user }, { _id: 1, name: 1, avatar: 1, creator: 1, createTime: 1 });
        groups.forEach((group) => {
            ctx.socket.socket.join(group._id);
            return group;
        });

        const friends = await Friend
            .find({ from: user._id })
            .populate('to', { avatar: 1, username: 1, neoAddress: 1 });
        // console.log(friends);
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
            neoAddress: user.neoAddress,
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
            .populate('from', { username: 1, avatar: 1, neoAddress: 1 });
        messages.reverse();

        return Object.assign({ messages }, group.toObject());
    },
    async changeAvatar(ctx) {
        const { avatar } = ctx.data;
        assert(avatar, 'The avatar can not be void');

        await User.update({ _id: ctx.socket.user }, {
            avatar,
        });

        return {};
    },
    async addFriend(ctx) {
        const { userId } = ctx.data;
        assert(isValid(userId), 'User ID not valid');

        const user = await User.findOne({ _id: userId });
        assert(user, 'User to add does not exist');


        const friend = await Friend.find({ from: ctx.socket.user, to: user._id });
        assert(friend.length === 0, 'Friendship already exists');

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
    async getUserInfos(ctx) {
        // userId
        const { userId } = ctx.data;
        assert(isValid(userId), 'User ID not valid');

        const user = await User.findOne({ _id: userId });
        assert(user, 'The user does not exist');
        return {
            _id: user._id,
            avatar: user.avatar,
            username: user.username,
            neoAddress: user.neoAddress,
        };
    },
    async deleteFriend(ctx) {
        const { userId } = ctx.data;
        assert(isValid(userId), 'User ID not valid');

        const user = await User.findOne({ _id: userId });
        assert(user, 'The user does not exist');

        await Friend.remove({ from: ctx.socket.user, to: user._id });
        return {};
    },

    async saveTransaction(ctx) {
        const { amount, asset, txid, receiver } = ctx.data;
        const newTx = await Transaction.create({
            from: ctx.socket.user,
            amount,
            asset,
            txid,
            neoAddress: receiver,
        });

        return {
            amount: newTx.amount, asset: newTx.asset, txid: newTx.txid, receiver: newTx.neoAddress,
        };
    },


};
