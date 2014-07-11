define('popup', ['events', 'eventtarget'], function(events, eventtarget) {

    function Popup(contents) {
        var wrapperElem = this.elem = document.createElement('div');
        wrapperElem.className = 'popup-wrapper';

        var elem = this.innerElem = document.createElement('div');
        elem.className = 'popup';
        elem.innerHTML = contents;
        wrapperElem.appendChild(elem);

        var closeButton = this.closeButton = document.createElement('a');
        closeButton.className = 'close-button';
        closeButton.innerHTML = '&times;';
        elem.appendChild(closeButton);

        var attrEvents = new eventtarget.EventTarget();
        var me = this;

        var resolution = new Promise(function(resolve, reject) {
            me.resolve = resolve;
            me.reject = reject;

            events.listen(closeButton, 'click', function() {
                me.close();
            });
        });

        this.then = resolution.then;

        this.on = function(eventType, handler) {
            events.listen(elem, eventType, handler);
            attrEvents.on(eventType, handler);
        };
    }

    Popup.prototype.show = function() {
        document.body.appendChild(this.elem);
    };

    Popup.prototype.close = function() {
        if (!this.elem.parentNode) {
            return;
        }
        this.elem.parentNode.removeChild(this.elem);
        this.resolve();
    };

    Popup.prototype.$ = function() {
        var iE = $(this.innerElem)
        return iE.find.apply(iE, arguments);
    };

    return Popup;
});
