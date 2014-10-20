define('main', ['collabs', 'column', 'comm', 'popup'], function(collabs, column, comm, popup) {
    'use strict';

    var board = document.querySelector('.board');
    var data;
    var columns = [];
    comm.on('newBoard', function(boardData) {
        data = boardData;
        if (boardData.image) document.body.style.backgroundImage = 'url(' + boardData.image + ')';
        if (boardData.color) document.body.style.backgroundColor = boardData.color;
        if (boardData.availableCollabs) collabs.set(data.availableCollabs);
        $('header h1').text(boardData.title);
        columns = boardData.board.map(column.get);
        board.innerHTML = columns.map(function(col) {
            return col.render();
        }).join('');

        init();
    });

    comm.on('colOrder', function(order) {
        columns.sort(function(a, b) {
            return order.indexOf(a.key) - order.indexOf(b.key);
        });
        var cols = $.makeArray($('.board > .column').detach()).sort(function(a, b) {
            return order.indexOf(a.getAttribute('data-key')) - order.indexOf(b.getAttribute('data-key'));
        })
        $(board).append(cols);
    });

    comm.on('newColumn', function(data) {
        var colModel = column.get(data.column);
        columns.push(colModel);
        var $column = $(colModel.render());
        makeSortable($column);
        $(board).append($column);
    });

    comm.on('boardTitle', function(boardData) {
        data.title = boardData.title;
        $('header h1').text(boardData.title);
    });

    comm.on('boardImage', function(boardData) {
        data.image = boardData.image;
        if (boardData.image)
            document.body.style.backgroundImage = 'url(' + boardData.image + ')';
        else
            document.body.style.backgroundImage = '';
    });

    comm.on('boardColor', function(boardData) {
        data.color = boardData.color;
        document.body.style.backgroundColor = boardData.color;
    });

    comm.on('setAvailableCollabs', function(data) {
        data.availableCollabs = data.collabs;
        collabs.set(data.collabs);
    });

    function makeSortable($el) {
        $el.find('.cards').sortable({
            update: cardsReordered,
            start: function(event) {
                $(event.target).closest('.column')[0].style.zIndex = 1000;
            },
            stop: function(event) {
                $(event.target).closest('.column')[0].style.zIndex = '';
            },
            connectWith: '.cards'
        }).disableSelection();
    }

    function init() {
        makeSortable($('.column'))

        $('.board').sortable({
            update: columnsReordered
        }).disableSelection();
    }

    function columnsReordered() {
        var order = $.makeArray($('.board > .column')).map(function(column) {
            return column.getAttribute('data-key');
        });
        comm.emit('setColOrder', order);
    }

    function cardsReordered(event, ui) {

        var $card = ui.item;

        var $oldColumn = $(event.target).closest('.column');
        var oldColumnKey = $oldColumn.data('key');
        var oldCol = getColumn(oldColumnKey);

        var $newColumn = $card.closest('.column');
        var newColumnKey = $newColumn.data('key');

        if (oldColumnKey === newColumnKey) {
            var order = $.makeArray($oldColumn.find('.card')).map(function(card) {
                return card.getAttribute('data-key');
            });
            comm.emit('colCardsReordered', {key: oldColumnKey, order: order});
            return;
        }

        var newCol = getColumn(newColumnKey);

        var cardKey = $card.data('key');
        var cardIndex = $card.index();
        var card = oldCol.removeCard(cardKey);
        // newCol.addCard(card, cardIndex);
        comm.emit('cardMoved', {key: cardKey, source: oldCol.key, destination: newCol.key, index: cardIndex});
    }

    function getColumn(key) {
        for (var i = 0; i < columns.length; i++) {
            if (columns[i].key === key) return columns[i];
        }
    }

    $('header h1').on('click', function(event) {
        var $target = $(event.target);
        var oldTitle = $target.text();
        var $input = $('<input type="text" value="">').val(oldTitle);
        $input.insertAfter(event.target);
        $target.hide();
        $input.focus();
        $input.on('keyup', function(event) {
            if (event.keyCode === 13) {
                comm.emit('boardTitle', $input.val());
                $input.remove();
                $target.show();
            }
        });
    });

    $('nav button.new').on('click', function() {
        comm.emit('newColumn', true);
    });

    $('nav button.edit').on('click', function() {
        var editBox = new popup(document.getElementById('boardEdit').innerHTML);
        editBox.show();

        var color = data.color || '#fff';

        editBox.$('[data-prop=title]').val(data.title).on('change, blur', function(event) {
            comm.emit('boardTitle', $(this).val());
        });

        editBox.$('[data-prop=image]').val(data.image).on('change, blur', function(event) {
            comm.emit('boardImage', $(this).val());
        });
        editBox.$('.color-picker span[data-value="' + color + '"]').addClass('selected');

        editBox.$('.color-picker span').on('click', function(event) {
            var $this = $(this);
            $this.closest('.color-picker').find('span.selected').removeClass('selected');
            $this.addClass('selected');
            var color = $this.data('value');
            data.color = color;

            comm.emit('boardColor', color);
        });
    });

});
