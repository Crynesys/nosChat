const axios = require('axios');
const assert = require('assert');
const User = require('../models/user');
const Group = require('../models/group');

let baiduToken = '';
let lastBaiduTokenTime = Date.now();

module.exports = {
    async search(ctx) {
        const { keywords } = ctx.data;
        if (keywords === '') {
            return {
                users: [],
                groups: [],
            };
        }

        const users = await User.find(
            { username: { $regex: keywords } },
            { avatar: 1, username: 1, neoAddress: 1 },
        );
        const groups = await Group.find(
            { name: { $regex: keywords } },
            { avatar: 1, name: 1, members: 1, nosAddress: 1 },
        );
        // console.log(groups);
        return {
            users,
            groups: groups.map(group => ({
                _id: group._id,
                avatar: group.avatar,
                name: group.name,
                members: group.members.length,
                nosAddress: group.nosAddress,
            })),
        };
    },
    async searchExpression(ctx) {
        const { keywords } = ctx.data;
        if (keywords === '') {
            return [];
        }

        const url = `https://api.giphy.com/v1/gifs/search?api_key=blaAyX4v6J5FERdLpX2xcf8AiC8mApvz&q=${encodeURIComponent(keywords)}&limit=25&offset=0&rating=G&lang=en
`;


        const response = await axios.get(url);
        assert(response.status === 200, 'Can not load the gifs, retry');


        const images = response.data.data;
        const returnData = images.map((gif, index) => {
            const jsonObj = {};
            jsonObj.url = gif.images.original.url;
            jsonObj.width = gif.images.original.width;
            jsonObj.height = gif.images.original.height;
            jsonObj.id = gif.id;
            jsonObj.title = gif.title;
            return jsonObj;
        });
        // console.log(returnData);
        return returnData;

        /* const res = await axios.get(`https://www.doutula.com/search?keyword=${encodeURIComponent(keywords)}`);
        assert(res.status === 200, 'Impossibile cercare il pacchetto di espressioni, riprova');


        const images = res.data.match(/data-original="[^ "]+"/g) || [];
        return images.map(i => i.substring(15, i.length - 1)); */
    },
    async getBaiduToken() {
        if (baiduToken && Date.now() < lastBaiduTokenTime) {
            return { token: baiduToken };
        }

        const res = await axios.get('https://openapi.baidu.com/oauth/2.0/token?grant_type=client_credentials&client_id=pw152BzvaSZVwrUf3Z2OHXM6&client_secret=fa273cc704b080e85ad61719abbf7794');
        assert(res.status === 200, 'Badu Token request failed');


        baiduToken = res.data.access_token;
        lastBaiduTokenTime = Date.now() + (res.data.expires_in - 60 * 60 * 24) * 1000;
        return { token: baiduToken };
    },
};
