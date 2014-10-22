define('popup', ['eventtarget'], function(eventtarget) {

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

        var resolution = $.Deferred();
        this.resolve = resolution.resolve;
        this.reject = resolution.reject;
        resolution.promise(this);

        $(closeButton).on('click', resolution.reject);

        var closer = function(event) {
            if (event.keyCode === 27) {
                resolution.reject();
            }
        };
        $(window).on('keyup', closer);

        resolution.always(function() {
            me.close();
            $(window).off('keyup', closer);
        });

        this.on = function(eventType, handler) {
            $(elem).on(eventType, handler);
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
