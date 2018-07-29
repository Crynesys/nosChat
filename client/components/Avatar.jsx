import React from 'react';
import PropTypes from 'prop-types';

import './components.less';

const avatarFallback = 'http://identicon.org?t=avatar_0&s=256';
const failTimes = new Map();

function noop() { }

function handleError(e) {
    const times = failTimes.get(e.target) || 0;
    if (times >= 2) {
        return;
    }
    e.target.src = avatarFallback;
    failTimes.set(e.target, times + 1);
}

const Avatar = ({ src, size = 60, onClick = noop, className = '' }) => (
    <img
        className={`component-avatar ${className}`}
        src={`http://identicon.org?t=${src}&s=256`}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        onClick={onClick}
        onError={handleError}
    />
);
Avatar.propTypes = {
    src: PropTypes.string.isRequired,
    size: PropTypes.number,
    className: PropTypes.string,
    onClick: PropTypes.func,
};

export default Avatar;
