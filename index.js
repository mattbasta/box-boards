var fs = require('fs');

var express = require('express');
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);

var boards = {};

function getBoard(id) {
    if (!boards[id]) {
        function col(title) {
            return {
                key: 'col_' + title,
                title: title,
                cards: []
            };
        }
        boards[id] = {
            title: 'Untitled Board',
            board: [
                col('Done'),
                col('Almost Done'),
                col('Blocked'),
                col('In Progress'),
                col('Prioritize')
            ],
            subscribers: []
        };
    }
    return boards[id];
}


app.get('/:id', function(req, res){
    var id = req.params.id;
    res.send(fs.readFileSync('src/index.html').toString().replace('BOARD_ID', id));
});

app.use(express.static(__dirname + '/src'));


io.on('connection', function(socket) {
    var data;
    socket.on('disconnect', function() {
        if (!data) return;
        data.subscribers = data.subscribers.filter(function(sock) {
            return sock !== socket;
        });
    });

    function getColumn(key) {
        for (var i = 0; i < data.board.length; i++) {
            if (data.board[i].key === key) return data.board[i];
        }
    }

    function getCard(column, key) {
        for (var i = 0; i < column.cards.length; i++) {
            if (column.cards[i].key === key) return column.cards[i];
        }
    }

    function findCard(key) {
        for (var i = 0; i < data.board.length; i++) {
            for (var j = 0; j < data.board[i].cards.length; j++) {
                if (data.board[i].cards[j].key === key) return data.board[i].cards[j];
            }
        }
    }

    function broadcast() {
        var args = Array.prototype.slice.call(arguments, 0);
        data.subscribers.forEach(function(user) {
            user.emit.apply(user, args);
        });
    }

    socket.on('boardID', function(boardID) {
        data = getBoard(boardID);
        data.subscribers.push(socket);
        socket.removeAllListeners('boardID');
        init();
        socket.emit('newBoard', {title: data.title, board: data.board});
    });

    function init() {
        socket.on('setColOrder', function(order) {
            data.board.sort(function(a, b) {
                return order.indexOf(a.key) - order.indexOf(b.key);
            });
            broadcast('colOrder', order);
        });

        socket.on('setColTitle', function(event) {
            data.board.forEach(function(col) {
                if (col.key !== event.key) return;
                col.title = event.title;
            });
            broadcast('column', event);
        });

        socket.on('colCardsReordered', function(newData) {
            var col = getColumn(newData.key);
            col.cards.sort(function(a, b) {
                return newData.order.indexOf(a.key) - newData.order.indexOf(b.key);
            });
            broadcast('cardOrder', newData);
        });

        socket.on('cardMoved', function(event) {
            var sourceCol = getColumn(event.source);
            var destCol = getColumn(event.destination);

            var card = getCard(sourceCol, event.key);
            sourceCol.cards = sourceCol.cards.filter(function(card) {
                return card.key !== event.key;
            });
            broadcast('removeCard', {column: event.source, key: card.key});

            destCol.cards.splice(event.index, 0, card);
            broadcast('addCard', {column: event.destination, card: card, index: event.index});

        });

        socket.on('newColumn', function(event) {
            var column;
            data.board.push(column = {
                title: 'Untitled',
                key: 'col' + Date.now(),
                cards: []
            });
            broadcast('newColumn', {column: column});

        });

        socket.on('newCard', function(event) {
            var column = getColumn(event.destination);
            var card = {
                key: 'card_' + Date.now(),
                title: event.title,
                description: '',
                comments: []
            };
            column.cards.push(card);
            broadcast('addCard', {column: event.destination, card: card, index: column.cards.length - 1});

        });

        socket.on('boardTitle', function(event) {
            data.title = event;
            broadcast('boardTitle', {title: event});
        });

        socket.on('cardUpdate', function(event) {
            var card = findCard(event.key);
            console.log(card.key, event.field, event.value);

            // TODO: Sanitize this.
            card[event.field] = event.value;

            broadcast('cardUpdate', event);

        });
    }
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});
