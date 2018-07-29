const assert = require('assert');
const { isValid } = require('mongoose').Types.ObjectId;

const Group = require('../models/group');
const Socket = require('../models/socket');
const Message = require('../models/message');
const config = require('../../config/server');
const getRandomAvatar = require('../../utils/getRandomAvatar');

async function getGroupOnlineMembers(group) {
    const sockets = await Socket
        .find(
            { user: group.members },
            { os: 1, browser: 1, environment: 1, user: 1, neoAddress: 1 },
        )
        .populate(
            'user',
            { username: 1, avatar: 1, neoAddress: 1 },
        );
    const filterSockets = sockets.reduce((result, socket) => {
        result[socket.user] = socket;
        return result;
    }, {});
    return Object.values(filterSockets);
}

module.exports = {
    async createGroup(ctx) {
        const ownGroupCount = await Group.count({ creator: ctx.socket.user });
        // assert(ownGroupCount < config.maxGroupsCount, `You can not create another group, reached the  ${config.maxGroupsCount} groups limit`);

        const { name, address, announcement } = ctx.data;
        assert(name, 'Group name can not be void');


        const group = await Group.findOne({ name });
        assert(!group, 'This Group already exists');
        // console.log(`indirizzo :${address}`);

        let newGroup = null;
        try {
            newGroup = await Group.create({
                name,
                avatar: getRandomAvatar(),
                creator: ctx.socket.user,
                members: [ctx.socket.user],
                nosAddress: address,
                announcement,
            });
        } catch (err) {
            if (err.name === 'ValidationError') {
                return 'Name of the group is not valid';
            }
            throw err;
        }

        ctx.socket.socket.join(newGroup._id);
        return {
            _id: newGroup._id,
            name: newGroup.name,
            avatar: newGroup.avatar,
            createTime: newGroup.createTime,
            creator: newGroup.creator,
            nosAddress: address,
            announcement,
        };
    },
    async joinGroup(ctx) {
        const { groupId } = ctx.data;
        assert(isValid(groupId), 'Group ID is not valid');

        const group = await Group.findOne({ _id: groupId });
        assert(group, 'The Group does not exists');

        assert(group.members.indexOf(ctx.socket.user) === -1, 'You are already a member');


        group.members.push(ctx.socket.user);
        await group.save();

        const messages = await Message
            .find(
                { toGroup: groupId },
                { type: 1, content: 1, from: 1, createTime: 1 },
                { sort: { createTime: -1 }, limit: 3 },
            )
            .populate('from', { username: 1, avatar: 1 });
        messages.reverse();

        ctx.socket.socket.join(group._id);

        return {
            _id: group._id,
            name: group.name,
            avatar: group.avatar,
            createTime: group.createTime,
            creator: group.creator,
            messages,
            nosAddress: group.nosAddress,
            announcement: group.announcement,
        };
    },
    async leaveGroup(ctx) {
        const { groupId } = ctx.data;
        assert(isValid(groupId), 'Group ID is not valid');

        const group = await Group.findOne({ _id: groupId });
        assert(group, 'The Group does not exists');
        assert(group.creator.toString() !== ctx.socket.user.toString(), 'Il proprietario non può lasciare il gruppo che ha creato');


        const index = group.members.indexOf(ctx.socket.user);
        assert(index !== -1, 'You are not in the group');


        group.members.splice(index, 1);
        await group.save();

        ctx.socket.socket.leave(group._id);

        return {};
    },
    async getGroupOnlineMembers(ctx) {
        const { groupId } = ctx.data;
        assert(isValid(groupId), 'Group ID is not valid');

        const group = await Group.findOne({ _id: groupId });
        assert(group, 'The Group does not exists');
        return getGroupOnlineMembers(group);
    },
    async getGroupInfos(ctx) {
        const { groupId } = ctx.data;
        assert(isValid(groupId), 'Group ID is not valid');

        const group = await Group.findOne({
            _id: groupId,
        });
        assert(group, 'The Group does not exists');

        return {
            _id: group._id,
            name: group.name,
            avatar: group.avatar,
            createTime: group.createTime,
            creator: group.creator,
            nosAddress: group.nosAddress,
            announcement: group.announcement,
        };
    },

    async getDefaultGroupOnlineMembers() {
        const group = await Group.findOne({ isDefault: true });
        assert(group, 'The Group does not exist');
        return getGroupOnlineMembers(group);
    },
    async changeGroupAvatar(ctx) {
        const { groupId, avatar } = ctx.data;
        assert(isValid(groupId), 'Group ID is not valid');
        assert(avatar, 'The avatar address can not be void ');


        await Group.update({ _id: groupId }, { avatar });
        return {};
    },
};
