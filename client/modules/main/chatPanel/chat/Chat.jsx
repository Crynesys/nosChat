import React, { Component } from 'react';
import autobind from 'autobind-decorator';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import ImmutablePropTypes from 'react-immutable-proptypes';
import immutable from 'immutable';
import * as qiniu from 'qiniu-js';

import fetch from 'utils/fetch';
import readDiskFile from 'utils/readDiskFile';
import config from 'root/config/client';
import action from '@/state/action';
import Avatar from '@/components/Avatar';
import Tooltip from '@/components/Tooltip';
import Message from '@/components/Message';
import SWMessage from '@/components/SWMessage';
import Button from '@/components/Button';
import IconButton from '@/components/IconButton';
import Dropdown from '@/components/Dropdown';
import Input from '@/components/Input';
import { Menu, MenuItem } from '@/components/Menu';
import HeaderBar from './HeaderBar';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import UserInfo from '../UserInfo';
import './Chat.less';

class Chat extends Component {
    static propTypes = {
        focus: PropTypes.string,
        members: ImmutablePropTypes.list,
        userId: PropTypes.string,
        creator: PropTypes.string,
        avatar: PropTypes.string,
        to: PropTypes.string,
        name: PropTypes.string,
        type: PropTypes.string,
        nosAddress: PropTypes.string,
        groupDescription: PropTypes.string,
        neoAddress: PropTypes.string,
    }
    constructor(...args) {
        super(...args);
        this.state = {
            groupInfoDialog: false,
            userInfoDialog: false,
            userInfo: {},
        };
    }
    componentDidMount() {
        document.body.addEventListener('click', this.handleBodyClick.bind(this), false);
    }

    nOSDropdown = (
        <div className="feature-dropdown">
            <Menu onClick={this.handleFeatureMenuClick}>
                <MenuItem key="neo">Send NEO</MenuItem>
                <MenuItem key="gas">Send Gas</MenuItem>
            </Menu>
        </div>
    )

    @autobind
    handleFeatureMenuClick({ key }) {
        // const userInfo = this.state;
        const nos = window.NOS.V1;
        let asset = null;
        const amount = this.assetQty.getValue();
        const receiver = this.state.nosAddress;
        switch (key) {
        case 'neo': {
            const neo = 'c56f33fc6ecfcd0c225c4ab356fee59390af8560be0e930faebe74a6daff7c9b';
            asset = neo;
            break;
        }
        case 'gas': {
            const gas = '602c79718b16e442de58778e148d0b1084e3b2dffd5de6b7b16cee7969282de7';
            asset = gas;
            break;
        }
        default:
        }
        console.log(`asset: ${asset} amount: ${amount} receiver: ${receiver}`);
        nos.send({ asset, amount, receiver })
            .then(txid => SWMessage.success(`${amount} ${key} inviati, transazione ${txid}`, 3))
            .catch((err) => {
                console.log(err.message);
                console.log(err);
                SWMessage.error(`Error: ${err.message}`);
            });

        // switch (key) {
        //     case 'neo': {
        //         const neo = 'c56f33fc6ecfcd0c225c4ab356fee59390af8560be0e930faebe74a6daff7c9b';
        //         // const gas = "602c79718b16e442de58778e148d0b1084e3b2dffd5de6b7b16cee7969282de7";

        //         const quantity = this.assetQty.getValue();
        //         nos.send(neo, quantity, 'AZ81H31DMWzbSnFDLFkzh9vHwaDLayV7fU')
        //             .then(txid => alert(`${quantity} NEO inviati, transazione ${txid}`))
        //             .catch(err => alert(`Error: ${err.message}`));
        //         break;
        //     }
        //     case 'gas': {
        //         const gas = '602c79718b16e442de58778e148d0b1084e3b2dffd5de6b7b16cee7969282de7';

        //         const quantity = this.assetQty.getValue();
        //         nos.send(gas, quantity, 'AZ81H31DMWzbSnFDLFkzh9vHwaDLayV7fU')
        //             .then(txid => alert(`${quantity} GAS inviati, transazione ${txid}`))
        //             .catch(err => alert(`Error: ${err.message}`));
        //         break;
        //     }
        //     default:
        // }
    }

    handleBodyClick(e) {
        if (!this.state.groupInfoDialog) {
            return;
        }

        const { currentTarget } = e;
        let { target } = e;
        do {
            if (/float-panel/.test(target.className)) {
                return;
            }
            target = target.parentElement;
        } while (target !== currentTarget);
        this.closeGroupInfo();
    }
    @autobind
    async groupInfoDialog(e) {
        const { focus, userId } = this.props;
        e.stopPropagation();
        e.preventDefault();

        let err = null;
        let result = null;
        let err2 = null;
        let result2 = null;
        if (userId) {
            [err, result] = await fetch('getGroupOnlineMembers', { groupId: focus });
            [err2, result2] = await fetch('getGroupInfos', { groupId: focus });
        } else {
            [err, result] = await fetch('getDefaultGroupOnlineMembers', { });
        }
        if (!err) {
            action.setGroupMembers(focus, result);
        }
        if (result2) {
            // alert('Group Address :' + result2.nosAddress)
            this.setState({
                groupInfoDialog: true,
                nosAddress: result2.nosAddress,
                groupDescription: result2.announcement,
            });
        } else {
            this.setState({
                groupInfoDialog: true,
            });
        }
    }
    @autobind
    closeGroupInfo() {
        this.setState({
            groupInfoDialog: false,
        });
    }
    @autobind
    showUserInfoDialog(userInfo) {
        this.setState({
            userInfoDialog: true,
            userInfo,
        });
    }
    @autobind
    closeUserInfoDialog() {
        this.setState({
            userInfoDialog: false,
        });
    }
    @autobind
    async changeGroupAvatar() {
        const { userId, focus } = this.props;
        const image = await readDiskFile('blob', 'image/png,image/jpeg,image/gif');
        if (image.length > config.maxImageSize) {
            return Message.error('Image for Group Avatar must be less than 1 MB');
        }

        const [err, tokenRes] = await fetch('uploadToken', {});
        if (!err) {
            const result = qiniu.upload(image.result, `GroupAvatar/${userId}_${Date.now()}`, tokenRes.token, { useCdnDomain: true }, {});
            result.subscribe({
                error(e) {
                    console.error(e);
                    Message.error('Impossible load image');
                },
                async complete(info) {
                    const imageUrl = `${tokenRes.urlPrefix + info.key}`;
                    const [changeGroupAvatarError] = await fetch('changeGroupAvatar', { groupId: focus, avatar: imageUrl });
                    if (!changeGroupAvatarError) {
                        action.setGroupAvatar(focus, URL.createObjectURL(image.result));
                        Message.success('Group Avatar Updated ');
                    }
                },
            });
        }
    }
    @autobind
    async leaveGroup() {
        const { focus } = this.props;
        const [err] = await fetch('leaveGroup', { groupId: focus });
        if (!err) {
            this.closeGroupInfo();
            action.removeLinkman(focus);
            Message.success('You leaved the group');
        }
    }
    renderMembers() {
        return this.props.members.map(member => (
            <div key={member.get('_id')}>
                <div>
                    <Avatar size={24} src={member.getIn(['user', 'avatar'])} />
                    <p>{member.getIn(['user', 'username'])}</p>
                </div>
                <Tooltip placement="top" trigger={['hover']} overlay={<span>{member.get('environment')}</span>}>
                    <p>
                        {member.get('browser')}
                        &nbsp;&nbsp;
                        {member.get('os') === 'Windows Server 2008 R2 / 7' ? 'Windows 7' : member.get('os')}
                    </p>
                </Tooltip>
            </div>
        ));
    }


    render() {
        const { groupInfoDialog, userInfoDialog, userInfo, nosAddress, groupDescription } = this.state;
        const { userId, creator, avatar, type, to, name, neoAddress } = this.props;
        const showNosData = ('NOS' in window) && (nosAddress != null);//
        // alert('chat.jsx : ' + neoAddress+','+nosAddress+' ');
        // alert(showNosData);
        return (
            <div className="module-main-chat">
                <HeaderBar onShowInfo={type === 'group' ? this.groupInfoDialog : this.showUserInfoDialog.bind(this, { _id: to, username: name, avatar, neoAddress })} />
                <MessageList showUserInfoDialog={this.showUserInfoDialog} />
                <ChatInput />
                <div className={`float-panel info ${groupInfoDialog ? 'show' : 'hide'}`}>
                    <p>Group Informations</p>
                    <div>
                        {/* <div className="avatar" style={{ display: !!userId && userId === creator ? 'block' : 'none' }}>
                            <p>Foto del Gruppo</p>
                            <img src={avatar} onClick={this.changeGroupAvatar} />
                        </div> */}
                        <div className="feature" style={{ display: !!userId && userId === creator ? 'none' : 'block' }}>
                            <p>Actions</p>
                            <Button type="danger" onClick={this.leaveGroup}>Exit</Button>
                        </div>
                        <div className="feature" style={{ display: !!userId && userId === creator ? 'none' : 'block' }}>
                            <p>Description</p>
                            <p>{groupDescription}</p>
                        </div>
                        {showNosData &&
                            <div className="feature" style={{ display: 'block' }}>
                                <p>Send to the group</p>
                                <p> Address : {nosAddress} </p>
                                <br />
                                <p> amount :  </p>
                                <Input ref={i => this.assetQty = i} />
                                <br />

                                <Dropdown
                                    trigger={['click']}
                                    overlay={this.nOSDropdown}
                                    animation="slide-up"
                                    placement="topLeft"
                                >
                                    <IconButton className="send" width={44} height={44} icon="send" iconSize={32} />
                                </Dropdown>
                            </div>

                        }

                        <div className="online-members">
                            <p>Members on-line</p>
                            <div>{this.renderMembers()}</div>
                        </div>
                    </div>
                </div>
                { userInfoDialog ? <UserInfo visible={userInfoDialog} userInfo={userInfo} onClose={this.closeUserInfoDialog} nosAddress={nosAddress} /> : ''}
            </div>
        );
    }
}

export default connect((state) => {
    const isLogin = !!state.getIn(['user', '_id']);
    if (!isLogin) {
        return {
            userId: '',
            focus: state.getIn(['user', 'linkmans', 0, '_id']),
            creator: '',
            avatar: state.getIn(['user', 'linkmans', 0, 'avatar']),
            members: state.getIn(['user', 'linkmans', 0, 'members']) || immutable.List(),
        };
    }

    const focus = state.get('focus');
    const linkman = state.getIn(['user', 'linkmans']).find(g => g.get('_id') === focus);
    // alert('Linkman : '+linkman.get('neoAddress') + " ," + linkman.get('name'));
    return {
        userId: state.getIn(['user', '_id']),
        focus,
        type: linkman.get('type'),
        creator: linkman.get('creator'),
        to: linkman.get('to'),
        name: linkman.get('name'),
        avatar: linkman.get('avatar'),
        members: linkman.get('members') || immutable.fromJS([]),
        neoAddress: linkman.get('neoAddress'),
    };
})(Chat);
