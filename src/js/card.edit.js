define('card.edit', ['collabs', 'comm', 'popup'], function(collabs, comm, Popup) {
    'use strict';

    function showEditBox(instance, event) {
        var $card = $(event.target).closest('.card');
        var editBox = new Popup(document.getElementById('cardEdit').innerHTML);
        editBox.show();

        var color = instance.color || '#fff';

        editBox.$('[data-prop=title]').val(instance.title);
        editBox.$('[data-prop=description]').val(instance.description);
        editBox.$('[data-prop=image]').val(instance.image);
        editBox.$('[data-prop=color]').val(color);
        editBox.$('.color-picker span[data-value="' + color + '"]').addClass('selected');

        function setMemberList() {
            editBox.$('.member-list').html(instance.members.map(function(member) {
                var $entry = $('<li>');
                $entry.text(member);
                var $closeButton = $('<a class="remove-collab" href="#">&times;</a>');
                $closeButton.attr('data-collab', member);
                $entry.append($closeButton);
                return $entry[0].outerHTML;
            }).join(''));
        }
        setMemberList();

        function addCollab() {
            var member = editBox.$('.members input').val().trim();
            var memberLower = member.toLowerCase();

            var members = collabs.get();
            members.forEach(function(storedMember) {
                if (storedMember.toLowerCase() === memberLower) {
                    member = storedMember;
                }
            });

            if (members.indexOf(member) === -1) {
                alert('Could not find an assignee with that name.');
                return;
            }
            if (instance.members.indexOf(member) !== -1) {
                alert('That member is already assigned.');
                return;
            }
            instance.members.push(member);
            comm.emit('cardUpdate', {key: instance.key, field: 'members', value: instance.members});
            setMemberList();
            editBox.$('.members input').val('').focus();
        }
        editBox.$('.members button').on('click', addCollab);
        editBox.$('.member-list').on('click', '.remove-collab', function(e) {
            var collab = $(e.target).data('collab');
            instance.members = instance.members.filter(function(mem) {
                return mem !== collab;
            });
            comm.emit('cardUpdate', {key: instance.key, field: 'members', value: instance.members});
            setMemberList();
        });
        editBox.$('.members input').on('keydown', function(e) {
            if (e.keyCode < 48 || e.keyCode > 90 && e.keyCode < 96) {
                return;
            }
            var value = $(this).val();
            if (this.selectionEnd !== value.length) {
                return;
            }
            console.log(value.substr(0, this.selectionStart));
            $(this).val(value.substr(0, this.selectionStart));
        });
        editBox.$('.members input').on('keyup', function(e) {
            if (e.keyCode === 13) {
                e.preventDefault();
                addCollab();
                return;
            }
            if (e.keyCode < 48 || e.keyCode > 90 && e.keyCode < 96) {
                return;
            }

            var $this = $(this);

            var currentLower = $this.val().toLowerCase();

            if (!currentLower) return;

            var startIndex = currentLower.length;
            var potentialCollabs = collabs.get();
            var potentialCollab;
            var collab;
            for (var i = 0; i < potentialCollabs.length; i++) {
                potentialCollab = potentialCollabs[i];
                if (currentLower !== potentialCollab.substr(0, startIndex).toLowerCase()) {
                    continue;
                }
                collab = potentialCollab;
                break;
            }
            if (!collab) {
                return;
            }

            console.log(startIndex, collab.length, currentLower, $this.val() + collab.substr(startIndex));
            $this.val($this.val() + collab.substr(startIndex));
            this.setSelectionRange(startIndex, collab.length, 'forward');

        });

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
        showEditBox: showEditBox
    };

});
