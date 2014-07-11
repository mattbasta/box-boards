define('main', ['column', 'comm'], function(column, comm) {
    'use strict';

    var board = document.querySelector('.board');
    var columns = [];
    comm.on('newBoard', function(boardData) {
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

    comm.on('boardTitle', function(data) {
        $('header h1').text(data.title);
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

    $('nav button').on('click', function() {
        comm.emit('newColumn', true);
    });

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

});
