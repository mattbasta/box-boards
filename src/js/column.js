define('column', ['comm', 'card', 'escape', 'events', 'eventtarget'], function(comm, card, escape, events, eventtarget) {
    'use strict';

    var columnEvents = new eventtarget.EventTarget();
    var columnCommEvents = new eventtarget.EventTarget();

    events.listen(document.body, 'click', function(event) {
        var column = $(event.target).closest('.column');
        if (!column.length) return;
        columnEvents.fire(column.data('key'), event.type, event);
    });

    comm.on('column', function(event) {
        columnCommEvents.fire(event.key, 'update', event);
    });

    comm.on('cardOrder', function(event) {
        columnCommEvents.fire(event.key, 'cardOrder', event);
    });

    comm.on('removeCard', function(event) {
        columnCommEvents.fire(event.column, 'removeCard', event);
    });

    comm.on('addCard', function(event) {
        columnCommEvents.fire(event.column, 'addCard', event);
    });

    comm.on('columnDelete', function(event) {
        columnCommEvents.fire(event.key, 'delete', event);
    });

    function Column(data) {
        this.key = data.key;
        this.title = data.title;
        this.cardModels = data.cards.map(card.get);

        columnEvents.on(this.key, this.handle.bind(this));
        columnCommEvents.on(this.key, this.handleRemote.bind(this));
    }

    Column.prototype.render = function() {
        return '<div class="column" data-key="' + this.key + '" data-draggable>' +
            '<h1>' + escape(this.title) + '</h1>' +
            '<div class="cards">' +
            this.cardModels.map(function(card) {
                return card.render();
            }).join('') +
            '</div>' +
            '<button class="deleteColumn" title="Delete Column">&times;</button>' +
            '<button class="addCard">Add Card</button>' +
            '</div>';
    };

    Column.prototype.handleRemote = function(type, event) {
        var $column = $('.column[data-key="' + (event.column || event.key) + '"]');
        switch (type) {
            case 'update':
                if (event.title) $column.find('h1').text(event.title);
                break;
            case 'cardOrder':
                var $cards = $column.find('.card');
                $cards.detach();
                var cards = $.makeArray($cards).sort(function(a, b) {
                    return event.order.indexOf(a.getAttribute('data-key')) - event.order.indexOf(b.getAttribute('data-key'));
                });
                $column.find('.cards').append(cards);
                break;
            case 'addCard':
                var newCard = card.get(event.card);
                this.cardModels.splice(event.index, 0, newCard);

                if ($column.find('.card[data-key="' + newCard.key + '"]').length) return;

                var rendered = newCard.render();
                var destinationCard = $column.find('.card')[event.index];
                if (destinationCard) {
                    $(rendered).insertBefore(destinationCard);
                } else {
                    $column.find('.cards').append(rendered);
                }
                break;
            case 'removeCard':
                this.cardModels = this.cardModels.filter(function(card) {
                    return card.key !== event.key;
                });
                $column.find('.card[data-key="' + event.key + '"]').remove();
                break;
            case 'delete':
                $column.remove();
                // TODO: Unbind from the event targets
                break;
        }
    };

    Column.prototype.handle = function(type, event) {
        var $target = $(event.target);
        var $column = $target.closest('.column');
        var me = this;
        switch (event.target.nodeName) {
            case 'H1':
                var $editor = $(getTextbox()).val(this.title);
                $target.after($editor);
                $editor.focus();
                $editor.on('blur', function() {
                    $editor.remove();
                    $column.find('h1').show();
                }).on('keyup', function(event) {
                    if (event.keyCode !== 13) return;
                    var $this = $(this);
                    var title = $this.val();
                    me.title = title;

                    comm.emit('setColTitle', {key: me.key, title: title});
                    $column.find('h1').show().text(title);
                    $this.remove();
                });
                $target.hide();
                break;

            case 'BUTTON':
                switch (event.target.className) {
                    case 'addCard':
                        var $editor = $target.siblings('.add-card-textbox');
                        $target.hide();
                        if (!$editor.length) {
                            $editor = $(getTextbox()).addClass('add-card-textbox');
                            $target.after($editor);
                            $editor.on('blur', function() {
                                $editor.hide();
                                $target.show();
                            }).on('keyup', function(event) {
                                switch (event.keyCode) {
                                    case 13:
                                        comm.emit('newCard', {
                                            title: $editor.val(),
                                            destination: me.key
                                        });
                                        $editor.focus().val('');
                                        break;
                                    case 27:
                                        $editor.hide();
                                        $target.show();
                                        break;
                                    default:
                                        return;
                                }
                                event.preventDefault();
                                event.stopPropagation();
                            });
                        }
                        $editor.show().focus();
                        break;

                    case 'deleteColumn':
                        if (!confirm('Are you sure you wish to delete "' + me.title + '"?')) return;
                        comm.emit('columnDelete', me.key);
                        break;
                }
                break;

        }
        event.stopPropagation();
        event.preventDefault();
    };

    Column.prototype.removeCard = function(key) {
        var card;
        for (var cardIndex = 0; cardIndex < this.cardModels.length; cardIndex++) {
            card = this.cardModels[cardIndex];
            if (card.key === key) break;
        }
        this.cardModels.splice(cardIndex, 1);
        return card;
    };

    function getTextbox() {
        return '<input type="text" value="">';
    }

    return {
        get: function(data) {
            return new Column(data);
        }
    };

});
