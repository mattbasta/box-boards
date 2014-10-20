define('collabs', ['escape'], function(escape) {
    'use strict';

    var collabList = [];
    var collabDL = document.createElement('datalist');
    collabDL.id = 'dl-collabs';
    document.body.appendChild(collabDL);

    return {
        set: function(collabs) {
            collabList = collabs;
            collabDL.innerHTML = collabs.map(function(c) {
                return '<option value="' + escape(c) + '">'
            }).join('');
        },
        get: function() {
            return collabList;
        },
        getColor: function(name) {
            return 'hsl(' + (name.charCodeAt(0) % 128) + ',75%,75%)';
        }
    };
});
