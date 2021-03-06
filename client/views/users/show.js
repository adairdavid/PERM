Template.usersShow.helpers({
    shifts: function() {
        var now = moment().tz('America/Edmonton').format();
        return Shifts.find({ownerId: this._id, start: {$gt: now}}, {sort: {start: 1}});
    },
    noShifts: function() {
        return Shifts.find({ownerId: this._id}, {sort: {start: 1}}).count() === 0;
    },
    roles: function() {
        return this.roles;
    },
    created: function() {
        return moment(this.profile.started).format('dddd, MMMM Do YYYY');
    },
});

Template.newShiftsModal.helpers({
    startDate: function() { return Session.get("startDate"); },
    endDate: function() { return Session.get("endDate"); },
    startTime: function() { return Session.get("startTime"); },
    endTime: function() { return Session.get("endTime"); }
});

Template.usersShow.events({
    'click .newShiftsButton': function(evt) {
        evt.preventDefault();

        var shownUserId = this._id;
        if (Roles.userIsInRole(shownUserId, 'inactive')) {
            throwFlash('danger', 'Cannot give shifts to inactive accounts.');
            return;
        }

        var boxes = $('input[name="weekdays"]:checked');

        var days = [];
        _.each(boxes, function(box) {
            var day;
            if (box.id == "Sunday") day = 0;
            else if (box.id == "Monday") day = 1;
            else if (box.id == "Tuesday") day = 2;
            else if (box.id == "Wednesday") day = 3;
            else if (box.id == "Thursday") day = 4;
            else if (box.id == "Friday") day = 5;
            else if (box.id == "Saturday") day = 6;
            days.push(day);
        });

        var startDate = $('input[id="fromDate"]').val();
        var endDate = $('input[id="toDate"]').val();
        var startTime = $('input[id="startTime"]').val();
        var endTime = $('input[id="endTime"]').val();
        var type = $('#shift-role').val();

        if (startDate == "" || endDate == "" || startTime == "" || endTime == "") {
            throwFlash('danger', 'Please fill in all form fields.');
            return;
        }

        Session.set("startDate", startDate);
        Session.set("endDate", endDate);
        Session.set("startTime", startTime);
        Session.set("endTime", endTime);

        var stime = startTime.split(':');
        var etime = endTime.split(':');

        var start = moment.tz(startDate, zone()).hour(stime[0]).minute(stime[1]);
        var end = moment.tz(endDate, zone()).hour(etime[0]).minute(etime[1]);
        var diff = end.diff(start, 'days');

        for (i = 0; i <= diff; i++) {
            var s = start.clone();
            s.add(i, 'days').format();

            if (_.contains(days, s.day())) {
                var e = s.clone();
                e.hour(etime[0]).minute(etime[1]);

                if (startTime > endTime) {
                    e.add(1, 'days');
                }

                var shift = {
                    ownerId: shownUserId,
                    start: s.format(),
                    end: e.format(),
                    type: type
                };

                Meteor.call('createShift', shift, function(error) {
                    if (error) {
                        throwFlash('danger', error.reason);
                    }
                });
            }
        }
    },
});

Template.shiftItemForUser.events({
    'click .deleteShiftButton': function(evt) {
        evt.preventDefault();

        Meteor.call('deleteShift', this, function(err) {
            if (err) {
                throwFlash('danger', err.reason);
            } else {
                throwFlash('success', 'Deleted shift.');
            }
        });
    },

    'click .dropShiftButton': function(evt) {
        evt.preventDefault();

        Meteor.call('dropShift', this, function(err) {
            if (err) {
                throwFlash('danger', err.reason);
            } else {
                throwFlash('success', 'Dropped shift.');
            }
        });
    }
});

Template.editUserProfileModal.helpers({
    formatedStartDate: function() {
        return moment(this.profile.started).format('YYYY-MM-DD');
    },
    allRoles: function() {
        return Meteor.roles.find({}, {sort: {name: -1}});
    },
    userIsInRole: function(user, role) {
        return user.roles[0] === role;
    }
});

Template.editUserProfileModal.events({
    'click .editUserProfileButton': function(evt) {
        evt.preventDefault();

        var currentUserId = this._id;
        var drops = this.profile.drops;
        var grabs = this.profile.grabs;

        var data = {
            args: {
                _id: currentUserId,
                user: {
                    profile: {
                        name: $('#userName').val(),
                        started: $('#joinDate').val(),
                        drops: drops,
                        grabs: grabs
                    }
                }
            },
            role: $('#userRole').val()
        };

        if (data.args.user.profile.name == "") {
            throwFlash('danger', 'User name cannot be blank!');
            return;
        }

        if (data.args.user.profile.started == "") {
            throwFlash('danger', 'Start date cannot be blank!');
            return;
        }

        Meteor.call('adminEditUser', data, function (err) {
            if (err) {
                throwFlash('danger', err.reason);
                return;
            }
            throwFlash('success', 'Edited account details.');
        });
    }
});
