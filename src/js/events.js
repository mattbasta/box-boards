window.services.events = (function(application) {
    'use strict';

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @param {HTMLElement} elem The element to put the binding expando on.
     * @return {void}
     */
    function setExpando(elem) {
        if (!('_bindings' in elem)) {
            elem._bindings = {};
        }
    }

    /**
     * @param {HTMLElement} elem The element to bind the event to.
     * @param {string} event The event to bind the callback to.
     * @param {function} callback The callback that should fire with the event.
     * @param {boolean} [capture] Whether the handler should be bound with useCapture
     * @return {void}
     */
    function addListener(elem, event, callback, capture) {
        if (elem.addEventListener) {
            elem.addEventListener(event, callback, !!capture);
        } else {
            elem.attachEvent('on' + event, callback);
        }
        // Also keep a reference
        elem._bindings[event] = elem._bindings[event] || [];
        elem._bindings[event].push(callback);
    }

    /**
     * @param {HTMLElement} elem The element to put remove the listener from.
     * @param {string} event The name of the event to unbind from.
     * @param {function} callback The callback that should be unbound.
     * @param {boolean} [capture] Whether the handler was bound with useCapture
     * @return {void}
     */
    function removeListener(elem, event, callback, capture) {
        if (elem.removeEventListener) {
            elem.removeEventListener(event, callback, !!capture);
        } else {
            elem.detachEvent('on' + event, callback);
        }

        // The caller is responsible for removing the reference to the callback
        // from the expando.
    }

    /**
     * Returns a list of events given a comma-separated list of events.
     *
     * @param {string} events A comma-separated list of event names.
     * @return {string[]}
     */
    function getEvents(events) {
        return events.split(/\s*,\s*/g)
    }

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------
    return {
        /**
         * Starts listening for an event on an element. An ID is returned
         * (similarly to setTimeout) which can be passed to `remove` to stop
         * listening.
         *
         * @param {HTMLElement} elem The element to listen for events on
         * @param {string} event The name (or comma-separated list of names) of events to listen for
         * @param {function} callback The callback to handle the event
         * @param {boolean} [capture] Whether the handler should be bound with useCapture
         * @return {int} ID of the event binding
         */
        listen: function(elem, event, callback, capture) {
            setExpando(elem);
            var events = getEvents(event);
            for (var i = 0; i < events.length; i++) {
                addListener(elem, events[i], callback, capture);
            }
        },

        /**
         * Removes event handlers that were bound using this service.
         *
         * @param {HTMLElement} elem The element to remove the handler(s) from
         * @param {string} event The name (or comma-separated list of names) of events to remove.
         * @param {capture} [capture] Whether the handler was bound with useCapture
         * @return {void}
         */
        stopListening: function(elem, event, capture) {
            // If there is no bindings expando, we have nothing to remove.
            if (!('_bindings' in elem)) {
                return;
            }

            var events = getEvents(event);
            var event;
            for (var i = 0; i < events.length; i++) {
                event = events[i];
                if (!(event in elem._bindings)) {
                    continue;
                }

                for (var j = 0; j < elem._bindings[event].length; j++) {
                    removeListener(elem, event, elem._bindings[event][j], capture);
                }

                // Clean up bindings.
                delete elem._bindings[event];

            }

        },

        /**
         * Removes a single event handler from an element
         *
         * @param {HTMLElement} elem The element to remove the handler from
         * @param {string} event The name of the event handler to remove
         * @param {function} callback The function callback
         * @param {boolean} [capture] Whether the handler should be bound with useCapture
         * @return {void}
         */
        remove: function(elem, event, callback, capture) {
            removeListener(elem, event, callback, capture);

            if (!elem._bindings || !(event in elem._bindings)) {
                return;
            }

            // Remove the handler from the binding expando.
            var newEventList = [];
            for (var i = 0; i < elem._bindings[event].length; i++) {
                if (elem._bindings[event][i] !== callback) {
                    newEventList.push(callback);
                }
            }
            elem._bindings[event] = newEventList;
        }
    };
}());
