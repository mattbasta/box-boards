var fs = require('fs');

var express = require('express');
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);

var boxContent = require('./lib/boxContent.js');


var boards = {};

function getBoard(id, auth, cb) {

    function createBoard() {
        function col(title) {
            return {
                key: 'col_' + title,
                title: title,
                cards: []
            };
        }
        return boards[id] = {
            title: 'Untitled Board',
            board: [
                col('Done'),
                col('Almost Done'),
                col('Blocked'),
                col('In Progress'),
                col('Prioritize')
            ]
        };
    }

    if (boards[id]) {
        cb(boards[id]);
        return;
    }

    boxContent.get(id, auth, function(err, body) {
        if (err) {
            console.warn('Could not read from box', err);
            cb(null);
            return;
        }
        boards[id] = body;
        body.subscribers = [];
        cb(body);
    });
}


app.get('/board/:id', function(req, res){
    var auth = req.param('auth');
    var id = req.params.id;
    res.send(fs.readFileSync('src/index.html').toString().replace('BOARD_ID', id).replace('AUTH', auth));
});

app.use('/redirect', function(req, res){
    var auth = req.param('auth_code');
    var file = req.param('file');
    res.set('Location', '/board/' + file + '?auth=' + auth);
    res.send(302, 'Redirecting...');
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
        boxContent.put(data, function(err, body) {
            if (err) console.error(err);
        });
    }

    socket.on('getBoard', function(req) {
        getBoard(req.boardID, req.auth, function(newBoard) {
            if (!newBoard) return;
            data = newBoard;
            data.subscribers.push(socket);
            socket.removeAllListeners('boardID');
            init();
            socket.emit('newBoard', {title: data.title, board: data.board});
        });
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

            // TODO: Sanitize this.
            card[event.field] = event.value;

            broadcast('cardUpdate', event);

        });
    }
});

var port = process.env.PORT || 3000;
http.listen(port, function(){
    console.log('listening on *:' + port);
});
