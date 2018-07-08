/* eslint-disable */
import React from 'react';
import Swal from 'sweetalert2';

function showMessage(text, duration = 1.5, type = 'success') {
    Swal({
        text,
        type,
        showConfirmButton: true,
    });
}//        timer: duration * 1000,

export default {
    success(text, duration) {
        showMessage(text, duration, 'success');
    },
    error(text, duration) {
        showMessage(text, duration, 'error');
    },
    warning(text, duration) {
        showMessage(text, duration, 'warning');
    },
    info(text, duration) {
        showMessage(text, duration, 'info');
    },
};

