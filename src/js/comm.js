define('comm', [], function() {
    'use strict';

    var auth = document.querySelector('meta[name="auth-id"]').getAttribute('content');
    var boardID = document.querySelector('meta[name="box-board"]').getAttribute('content');
    var socket = io();
    socket.emit('getBoard', {auth: auth, boardID: boardID});

    return {
        on: socket.on.bind(socket),
        emit: socket.emit.bind(socket)
    };

});
