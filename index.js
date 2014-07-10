var fs = require('fs');

var express = require('express');
var app = express();

var http = require('http').Server(app);
var io = require('socket.io')(http);


var data = [
    {
        "key": "col1",
        "title": "Column 1",
        "cards": [
            {
                "key": "card1",
                "title": "Hello!",
                "description": "This is the description"
            }
        ]
    },
    {
        "key": "col2",
        "title": "Column 2",
        "cards": [
            {
                "title": "Hello!",
                "description": "This is the description"
            },
            {
                "title": "Hello!"
            }
        ]
    },
];


app.get('/', function(req, res){
    res.send(fs.readFileSync('src/index.html').toString());
});

app.use(express.static(__dirname + '/src'));

io.on('connection', function(socket) {
    console.log('connection');
    socket.on('disconnect', function() {
        console.log('disconnection');
    });

    socket.on('boardID', function(boardID) {
        // TODO: Fetch the board
        socket.emit('board', data);
    });
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});
