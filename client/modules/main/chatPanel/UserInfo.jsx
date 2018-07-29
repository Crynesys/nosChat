import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import ImmutablePropTypes from 'react-immutable-proptypes';
import autobind from 'autobind-decorator';
import immutable from 'immutable';

import Dialog from '@/components/Dialog';
import Avatar from '@/components/Avatar';
import Button from '@/components/Button';
import Message from '@/components/Message';
import IconButton from '@/components/IconButton';
import Dropdown from '@/components/Dropdown';
import { Menu, MenuItem } from '@/components/Menu';
import action from '@/state/action';
import fetch from 'utils/fetch';
import getFriendId from 'utils/getFriendId';
import Input from '@/components/Input';
import SWMessage from '@/components/SWMessage';

class UserInfo extends Component {
    static propTypes = {
        visible: PropTypes.bool,
        userInfo: PropTypes.object,
        onClose: PropTypes.func,
        linkmans: ImmutablePropTypes.list,
        userId: PropTypes.string,
        nosAddress: PropTypes.string,
    }

    FindNosAddress() {
        const { userInfo } = this.props;
        console.log(userInfo);
        return null;
        // const userId = userInfo._id;
        // let err = null;
        // let res = null;
        // alert(`FindNosAddress ${userId}`);
        // let nosAddress = null;
        // if (userId === undefined) {
        //     alert("userInfo._id == 'undefined'");
        //     return null;
        // }
        // [err, res] = await fetch('getUserInfos', { userId });
        // if (!err) {
        //     alert("res "+res);
        //     nosAddress = res;
        // }
        // return nosAddress;
    }

    @autobind
    handleFocusUser() {
        const { userInfo, userId, onClose, nosAddress } = this.props;
        onClose();
        action.setFocus(getFriendId(userInfo._id, userId));
    }
    // @autobind
    // invia() {
    //     const quantity = this.assetQty.getValue();
    //     const nos = window.NOS.V1;

    //     nos.send('602c79718b16e442de58778e148d0b1084e3b2dffd5de6b7b16cee7969282de7', quantity, 'AZ81H31DMWzbSnFDLFkzh9vHwaDLayV7fU')
    //         .then(txid => alert(`${quantity} GAS sent in transaction ${txid}`))
    //         .catch(err => alert(`Error: ${err.message}`));

    //     // alert(`Invia :AZ81H31DMWzbSnFDLFkzh9vHwaDLayV7fU :${  this.assetQty.getValue()}`);
    // }
    @autobind
    async handleAddFriend() {
        const { userInfo, userId, linkmans, onClose } = this.props;
        const [err, res] = await fetch('addFriend', { userId: userInfo._id });
        if (!err) {
            onClose();
            const _id = getFriendId(userId, res._id);
            let existCount = 0;
            const linkman = linkmans.find(l => l.get('_id') === _id && l.get('type') === 'temporary');
            if (linkman) {
                existCount = linkman.get('messages').size;
                action.setFriend(_id, userId, userInfo._id);
            } else {
                const newLinkman = {
                    _id,
                    type: 'friend',
                    createTime: Date.now(),
                    avatar: res.avatar,
                    name: res.username,
                    messages: [],
                    unread: 0,
                    from: res.from,
                    to: res.to,
                };
                action.addLinkman(newLinkman, true);
            }
            const [err2, messages] = await fetch('getLinkmanHistoryMessages', { linkmanId: _id, existCount });
            if (!err2) {
                action.addLinkmanMessages(_id, messages);
            }
        }
    }
    @autobind
    async handleDeleteFriend() {
        const { userInfo, userId, onClose } = this.props;
        const [err] = await fetch('deleteFriend', { userId: userInfo._id });
        if (!err) {
            onClose();
            action.removeLinkman(getFriendId(userId, userInfo._id));
            Message.success('Non siete più amici');
        }
    }

    @autobind
    handleFeatureMenuClick({ key }) {
        // const userInfo = this.state;
        const { userInfo } = this.props;

        const nos = window.NOS.V1;
        let asset = null;
        const amount = this.assetQty.getValue();
        const receiver = userInfo.neoAddress;
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
        alert(receiver);
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

    nOSDropdown = (
        <div className="feature-dropdown">
            <Menu onClick={this.handleFeatureMenuClick}>
                <MenuItem key="neo">Send NEO</MenuItem>
                <MenuItem key="gas">Send Gas</MenuItem>
            </Menu>
        </div>
    )

    render() {
        const { visible, userInfo, onClose, linkmans, neoAddress } = this.props;
        const isFriend = linkmans.find(l => l.get('to') === userInfo._id && l.get('type') === 'friend');
        const indirizzo = userInfo.neoAddress;
        const showNosData = ('NOS' in window) && indirizzo;//
        console.log(indirizzo);
        // alert(`indirizzo ${indirizzo}`);
        // info-dialog  className="pane"
        return (
            <Dialog className="dialog fiora-info " visible={visible} onClose={onClose}>
                <div>
                    {
                        visible && userInfo ?
                            <div className="content">
                                <div className="header">
                                    <Avatar size={60} src={userInfo.avatar} />
                                    <p>{userInfo.username}</p>
                                    <br />
                                    {showNosData &&
                                        <React.Fragment>
                                            <p> Address : {indirizzo} </p>
                                            <br />
                                            <p> Amount :  </p>
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

                                        </React.Fragment>


                                    }

                                </div>
                                {
                                    userInfo._id === '5adad39555703565e7903f79' && userInfo.username !== 'robot10' ?
                                        <div className="info">
                                            <p>Questo è un alieno</p>
                                        </div>
                                        :
                                        <div className="header">
                                            {
                                                isFriend ? <Button onClick={this.handleFocusUser}>Send amessage</Button> : null
                                            }
                                            {
                                                isFriend ?
                                                    <Button type="danger" onClick={this.handleDeleteFriend}>Delete friendship</Button>
                                                    :
                                                    <Button onClick={this.handleAddFriend}>Add as a friend</Button>
                                            }
                                        </div>
                                }
                            </div>
                            :
                            null
                    }
                </div>
            </Dialog>
        );
    }
}

export default connect(state => ({
    linkmans: state.getIn(['user', 'linkmans']) || immutable.fromJS([]),
    userId: state.getIn(['user', '_id']),
}))(UserInfo);
