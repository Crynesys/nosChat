import React from 'react';

import Button from './Button';
import './components.less';


class FAButton extends Button {
    render() {
        const {
            width, height, icon, iconSize, onClick, style,
        } = this.props;
        return (
            <div className="component-FAButton" style={Object.assign({ width, height }, style)} onClick={onClick}>
                <i className={`fas ${icon}`} style={{ fontSize: iconSize, lineHeight: `${height}px` }} />
            </div>
        );
    }
}

export default FAButton;
