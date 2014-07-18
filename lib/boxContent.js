var fs = require('fs');

var request = require('request');
var superagent = require('superagent');


function getAccessToken(authCode, cb) {
    console.log('Getting access token from auth code');
    superagent.post('https://www.box.com/api/oauth2/token')
        .type('form')
        .send({grant_type: 'authorization_code'})
        .send({code: authCode})
        .send({client_id: process.env.CLIENT_ID})
        .send({client_secret: process.env.CLIENT_SECRET})
        .end(function(res) {
            console.log('Got response from access token');
            if (res.error) return cb(res.error);
            cb(null, res.body.access_token, res.body.refresh_token, Date.now() + res.body.expires_in * 1000);
        });
}
function getNewAccessToken(refreshToken, cb) {
    console.log('Getting new access token from auth code');
    superagent.post('https://www.box.com/api/oauth2/token')
        .type('form')
        .send({grant_type: 'refresh_token'})
        .send({refresh_token: refreshToken})
        .send({client_id: process.env.CLIENT_ID})
        .send({client_secret: process.env.CLIENT_SECRET})
        .end(function(res) {
            console.log('Got response from new access token');
            if (res.error) return cb(res.error);
            cb(null, res.body.access_token, res.body.refresh_token, Date.now() + res.body.expires_in * 1000);
        });
}

exports.get = function(fileID, auth, cb) {
    getAccessToken(auth, function(err, accessToken, refreshToken, expires) {
        if (err) return cb(err, null);
        console.log('Getting board content');
        superagent.get('https://api.box.com/2.0/files/' + fileID + '/content')
            .set('Authorization', 'Bearer ' + accessToken)
            .redirects(0)
            .end(function(res) {
                console.log('Got response from board');
                if (res.error) return cb(res.error);
                request.get(res.headers.location, function(err, res, body) {
                    console.log('Got contents of board');
                    var body;
                    try {
                        body = JSON.parse(body);
                    } catch (e) {
                        cb(e);
                        return;
                    }
                    body.id = fileID;
                    body.accessToken = accessToken;
                    body.refreshToken = refreshToken;
                    body.tokenExpires = expires;
                    cb(null, body);
                });
            });
    });
};

exports.put = function(board, cb) {
    function doPut() {
        var boardData = JSON.stringify({
            title: board.title,
            board: board.board,
            image: board.image,
            color: board.color
        });

        var boardPath = '/tmp/board_' + board.id;
        fs.writeFile(boardPath, boardData, function() {
            superagent.post('https://upload.box.com/api/2.0/files/' + board.id + '/content')
                .set('Authorization', 'Bearer ' + board.accessToken)
                .attach('filename', boardPath)
                .end(function(res) {
                    if (res.error) return cb(res.error);
                    cb(null, res.body);
                });
        });

    }
    function refreshToken() {
        getNewAccessToken(board.refreshToken, function(err, accessToken, refreshToken, expires) {
            if (err) return cb(err);
            board.accessToken = accessToken;
            board.refreshToken = refreshToken;
            board.tokenExpires = tokenExpires;
            doPut();
        })
    }
    if (board.tokenExpires < Date.now() - 5000) {
        refreshToken();
    } else {
        doPut();
    }
};
