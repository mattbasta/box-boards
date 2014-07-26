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
        this.color = data.color;

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

        var color = instance.color || '#fff';

        editBox.$('[data-prop=title]').val(instance.title);
        editBox.$('[data-prop=description]').val(instance.description);
        editBox.$('[data-prop=image]').val(instance.image);
        editBox.$('[data-prop=color]').val(color);
        editBox.$('.color-picker span[data-value="' + color + '"]').addClass('selected');

        editBox.$('[data-prop]').on('change, blur', function(event) {
            var $this = $(this);
            comm.emit('cardUpdate', {key: instance.key, field: $this.data('prop'), value: $this.val()});
        });

        editBox.$('.color-picker span').on('click', function(event) {
            var $this = $(this);
            $this.closest('.color-picker').find('span.selected').removeClass('selected');
            $this.addClass('selected');
            var color = $this.data('value');
            $this.closest('label').find('input').val(color);
            comm.emit('cardUpdate', {key: instance.key, field: 'color', value: color});
        });

        editBox.$('.delete-card').on('click', function(event) {
            if (!confirm('Are you sure you wish to delete "' + instance.title + '"?')) return;
            editBox.close();
            comm.emit('cardDelete', {key: instance.key});
        });

    }

    return {
        get: function(data) {
            return new Card(data);
        }
    };

});
