var fs = require('fs');

var Promise = require('promise');
var request = require('request');
var superagent = require('superagent');


function getAccessToken(authCode) {
    console.log('Getting access token from auth code');
    return new Promise(function(resolve, reject) {
        superagent.post('https://www.box.com/api/oauth2/token')
            .type('form')
            .send({grant_type: 'authorization_code'})
            .send({code: authCode})
            .send({client_id: process.env.CLIENT_ID})
            .send({client_secret: process.env.CLIENT_SECRET})
            .end(function(res) {
                console.log('Got response from access token');
                if (res.error) return reject(res.error);
                resolve(res.body.access_token, res.body.refresh_token, Date.now() + res.body.expires_in * 1000);
            });
    });
}
function getNewAccessToken(refreshToken) {
    console.log('Getting new access token from auth code');
    return new Promise(function(resolve, reject) {
        superagent.post('https://www.box.com/api/oauth2/token')
            .type('form')
            .send({grant_type: 'refresh_token'})
            .send({refresh_token: refreshToken})
            .send({client_id: process.env.CLIENT_ID})
            .send({client_secret: process.env.CLIENT_SECRET})
            .end(function(res) {
                console.log('Got response from new access token');
                if (res.error) return reject(res.error);
                resolve(res.body.access_token, res.body.refresh_token, Date.now() + res.body.expires_in * 1000);
            });
    });
}

function getBoardContent(fileID, accessToken, refreshToken, expires) {
    return new Promise(function(resolve, reject) {
        superagent.get('https://api.box.com/2.0/files/' + fileID + '/content')
            .set('Authorization', 'Bearer ' + accessToken)
            .redirects(0)
            .end(function(res) {
                console.log('Got response from board');
                if (res.error) return reject(res.error);

                request.get(res.headers.location, function(err, res, body) {
                    console.log('Got contents of board');
                    var body;
                    try {
                        body = JSON.parse(body);
                    } catch (e) {
                        reject(e);
                        return;
                    }
                    body.id = fileID;
                    body.accessToken = accessToken;
                    body.refreshToken = refreshToken;
                    body.tokenExpires = expires;
                    resolve(body);
                });
            });
    });
}
function getCollaborators(fileID, accessToken) {
    return new Promise(function(resolve, reject) {
        superagent.get('https://api.box.com/2.0/files/' + fileID + '?fields=parent,owned_by')
            .set('Authorization', 'Bearer ' + accessToken)
            .end(function(res) {
                if (res.error) return reject(res.error);
                var owner = res.body.owned_by;
                superagent.get('https://api.box.com/2.0/folders/' + res.body.parent.id + '/collaborations')
                    .set('Authorization', 'Bearer ' + accessToken)
                    .end(function(res) {
                        if (res.error) return reject(res.error);
                        resolve(res.body.entries.map(function(entry) {
                            return entry.accessible_by.name;
                        }).concat([owner.name]));
                    });
            });

    });
}


var ongoingRequests = {};

exports.get = function(fileID, auth) {
    var promise = new Promise(function(resolve, reject) {
        getAccessToken(auth).then(function(accessToken, refreshToken, expires) {
            console.log('Getting board content');
            if (fileID in ongoingRequests) {
                console.log('Already loading board, returning existing promise');
                return ongoingRequests[fileID];
            }
            ongoingRequests[fileID] = promise;

            var collabPromise = getCollaborators(fileID, accessToken);
            getBoardContent(fileID, accessToken, refreshToken, expires).then(function(board) {
                resolve([board, collabPromise]);
                delete ongoingRequests[fileID];
            }, reject);
        });
    });

    return promise;
};

exports.put = function(board) {
    return new Promise(function(resolve, reject) {
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
                        if (res.error) return reject(res.error);
                        resolve(res.body);
                    });
            });

        }
        function refreshToken() {
            getNewAccessToken(board.refreshToken, function(err, accessToken, refreshToken, expires) {
                if (err) return reject(err);
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
    });
};
