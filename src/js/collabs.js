define('collabs', ['escape'], function(escape) {
    'use strict';

    var collabList = [];
    var collabDL = document.getElementById('dl-collabs');

    return {
        set: function(collabs) {
            collabList = collabs;
            collabDL.innerHTML = collabs.map(function(c) {
                return '<option value="' + escape(c) + '">'
            }).join('');
        },
        get: function() {
            return collabList;
        }
    };
});
