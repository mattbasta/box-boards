define('card', ['comm', 'escape', 'events', 'eventtarget', 'popup'], function(comm, escape, events, eventtarget, popup) {
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

        cardEvents.on(this.key, this.handle.bind(this));
        cardCommEvents.on(this.key, this.handleRemote.bind(this));
    }

    Card.prototype.render = function() {
        var style = '';
        if (this.image) {
            style += ' style="background-image: url(' + escape(this.image) + ')" data-has-image';
        }

        return '<div class="card" data-key="' + this.key + '" data-draggable' + style + '>' +
            '<span>' + escape(this.title) + '</span>' +
            this.renderCharms() +
            '</div>';
    };

    Card.prototype.getCharms = function() {
        var charms = [];
        if (this.description) charms.push(['info', 'Has Description']);
        return charms;
    };

    Card.prototype.renderCharms = function() {
        return '<div class="charms">' +
            this.getCharms().map(function(charm) {
                return '<i class="fa fa-' + charm[0] + '" title="' + charm[1] + '"></i>';
            }).join('') +
            '</div>';
    };

    Card.prototype.handle = function(type, event) {
        switch (type) {
            case 'click':
                showEditBox(this, event);
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

    function showEditBox(instance, event) {
        var $card = $(event.target).closest('.card');
        var editBox = new popup(document.getElementById('cardEdit').innerHTML);
        editBox.show();

        editBox.$('[data-prop=title]').val(instance.title);
        editBox.$('[data-prop=description]').val(instance.description);
        editBox.$('[data-prop=image]').val(instance.image);

        editBox.$('[data-prop]').on('change, blur', function(event) {
            var $this = $(this);
            comm.emit('cardUpdate', {key: instance.key, field: $this.data('prop'), value: $this.val()});
        });

    }

    return {
        get: function(data) {
            return new Card(data);
        }
    };

});
