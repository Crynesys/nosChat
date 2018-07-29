import React, { Component } from 'react';
import { connect } from 'react-redux';
import immutable from 'immutable';
import ImmutablePropTypes from 'react-immutable-proptypes';
import PropTypes from 'prop-types';

import action from '@/state/action';
import Linkman from './Linkman';

class LinkmanGroup extends Component {
    static propTypes = {
        linkmans: ImmutablePropTypes.list,
        focus: PropTypes.string,
    }
    componentWillReceiveProps(nextProps) {
        if (this.props.linkmans.size === 0 && nextProps.linkmans.size !== 0) {
            action.setFocus(nextProps.linkmans.getIn(['0', '_id']));
        }
    }
    renderLinkman(linkman) {
        const linkmanId = linkman.get('_id');
        const unread = linkman.get('unread');
        const lastMessage = linkman.getIn(['messages', linkman.get('messages').size - 1]);

        let time = new Date(linkman.get('createTime'));
        let preview = 'no news';
        if (lastMessage) {
            time = new Date(lastMessage.get('createTime'));
            preview = `${lastMessage.get('content')}`;
            if (linkman.get('type') === 'group') {
                preview = `${lastMessage.getIn(['from', 'username'])}: ${preview}`;
            }
        }
        return (
            <Linkman
                key={linkmanId}
                name={linkman.get('name')}
                avatar={linkman.get('avatar')}
                preview={preview}
                time={time}
                unread={unread}
                focus={this.props.focus === linkmanId}
                onClick={action.setFocus.bind(null, linkmanId)}
            />
        );
    }
    render() {
        const { linkmans } = this.props;
        return (
            <div className="chatPanel-linkman-group">
                {
                    linkmans.map(linkman => (
                        this.renderLinkman(linkman)
                    ))
                }
            </div>
        );
    }
}

export default connect(state => ({
    linkmans: state.getIn(['user', 'linkmans']) || immutable.List(),
    focus: state.get('focus'),
}))(LinkmanGroup);
