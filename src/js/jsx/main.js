/** @jsx React.DOM */
(function() {
'use strict';

var boardID = document.querySelector('meta[name="box-board"]').getAttribute('content');
var socket = io();

var Card = React.createClass({
    getCharms: function() {
        var charms = [];
        if (this.props.description) charms.push(['info', 'Has Description']);
        return charms;
    },
    render: function() {
        var charms = this.getCharms().map(function(charm) {
            return <i className={"fa fa-" + charm[0]} title={charm[1]}></i>
        });
        return (
            <div key={this.props.key} className="card">
              <span>{this.props.title}</span>
              <div className="charms">
                {charms}
              </div>
            </div>
        );
    }
});

var Column = React.createClass({
    render: function() {
        var cards = this.props.cards.map(function(card) {
            return (
                <Card title={card.title} description={card.description} key={card.key} />
            );
        });
        return (
          <div className="column">
            <h1>{this.props.title}</h1>
            {cards}
          </div>
        );
    }
});

var Board = React.createClass({
    getInitialState: function() {
        return {data: []};
    },
    componentWillMount: function() {
        socket.emit('boardID', boardID);
        socket.on('board', function(boardData) {
            this.setState({data: boardData}, init);
        }.bind(this));
    },
    render: function() {
        var columns = this.state.data.map(function(column) {
            return <Column title={column.title} cards={column.cards} key={column.key} />
        });
        return (
            <div className="board">
              {columns}
            </div>
        );
    }
});

var services = window.services = {};

React.renderComponent(
  <Board />,
  document.querySelector('.board-target')
);

function init() {
    nativesortable(
        document.querySelector('.board'),
        {change: columnsChanged}
    );
}

function columnsChanged(x, y) {
    console.log(x, y);
    //
}

}());
