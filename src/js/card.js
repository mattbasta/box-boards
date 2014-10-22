define('card',
    ['card.edit', 'collabs', 'comm', 'escape', 'events', 'eventtarget'],
    function(cardEdit, collabs, comm, escape, events, eventtarget) {
    'use strict';

    var cardEvents = new eventtarget.EventTarget();
    var cardCommEvents = new eventtarget.EventTarget();

    events.listen(document.body, 'click', function(event) {
        var card = $(event.target).closest('.card');
        if (!card.length) return;
        cardEvents.fire(card.data('key'), 'click', event);
    });

    comm.on('cardUpdate', function(event) {
        cardCommEvents.fire(event.key, 'update', event);
    });

    function Card(data) {
        this.key = data.key;
        this.title = data.title;
        this.description = data.description;
        this.image = data.image;
        this.color = data.color;

        this.members = data.members || [];
        this.comments = data.comments;

        cardEvents.on(this.key, this.handle.bind(this));
        cardCommEvents.on(this.key, this.handleRemote.bind(this));
    }

    Card.prototype.render = function() {
        var style = '';
        var attrs = '';
        if (this.image) {
            style += 'background-image: url(' + escape(this.image) + ');';
            attrs += ' data-has-image';
            if (this.color) {
                style += 'color: ' + escape(this.color) + ';';
                attrs += ' data-has-color';
            }
        } else if (this.color) {
            style += 'background-color: ' + escape(this.color) + ';';
            attrs += ' data-has-color';
        }

        if (style) {
            style = ' style="' + style + '"';
        }

        return '<div class="card" data-key="' + this.key + '" data-draggable' + style + attrs + '>' +
            '<span>' + escape(this.title) + '</span>' +
            this.renderMembers() +
            this.renderCharms() +
            '</div>';
    };

    Card.prototype.getCharms = function() {
        var charms = [];
        if (this.description) charms.push(['info', 'Has Description']);
        if (this.comments && this.comments.length) charms.push(['comments', 'Has Comments']);
        return charms;
    };

    Card.prototype.renderCharms = function() {
        return '<div class="charms">' +
            this.getCharms().map(function(charm) {
                return '<i class="fa fa-' + charm[0] + '" title="' + charm[1] + '"></i>';
            }).join('') +
            '</div>';
    };

    Card.prototype.renderMembers = function() {
        if (!this.members.length) {
            return '';
        }
        return '<div class="members">' +
            this.members.map(function(member) {
                return '<b style="background-color:' + collabs.getColor(member) + '">' +
                    member.split(' ').map(function(name) {
                        return name[0];
                    }).join('').substr(0, 2) +
                    '</b>';
            }).join('') +
            '</div>';
    };

    Card.prototype.handle = function(type, event) {
        switch (type) {
            case 'click':
                cardEdit.showEditBox(this, event);
                break;
            default:
                return;
        }
        event.stopPropagation();
        event.preventDefault();
    };

    Card.prototype.handleRemote = function(type, event) {
        var $card = $('.card[data-key="' + event.key + '"]');
        switch (type) {
            case 'update':
                this[event.field] = event.value;
                $(this.render()).replaceAll($card);
                break;
        }
    };

    return {
        get: function(data) {
            return new Card(data);
        }
    };

});
