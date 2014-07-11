define('comm', [], function() {
    'use strict';

    var boardID = document.querySelector('meta[name="box-board"]').getAttribute('content');
    var socket = io();
    socket.emit('boardID', boardID);

    return {
        on: socket.on.bind(socket),
        emit: socket.emit.bind(socket)
    };

});
