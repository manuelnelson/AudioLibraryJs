/// <reference path="jquery-1.7.1-vsdoc.js" />
window.Mashup = window.Mashup || {};

//allows underscore to use mustache {{name}} brackets instead of underscores horrendous conventions
_.templateSettings.interpolate = /\{\{(.+?)\}\}/g;

Mashup.properties = {
    bpmDelta: 2.0,
    draggableDefaultOptions: {
        revert: 'invalid',
        cursorAt: {
            left: 85
        },
        helper: function (event) {
            var clone = $(this).clone();
            clone.children('button').remove();
            clone.removeClass('highlight');
            var sampleClone = $("<li />")
                .append(clone)
                .addClass('sampleSelected');
            return sampleClone;
        }
    },
    droppableDefaultOptions: {
        accept: '.sampleList li, .sample, #waveformSample',
        hoverClass: 'hover',
        drop: function (event, ui) { 
            //If we are dragging from sample a sample, we need to get new start and end times.
            var sampleOptions = {};
            if ($(ui.draggable.context).attr('data-waveform')) {
                //configure sampleOptions here
                $('#sampleWaveform').audioViewer('setPlayTimes');
                sampleOptions.trimStart = $('#audioViewerControls').audioPlayerWaveformViewer('option', 'waveformStart');
                sampleOptions.playDuration = $('#audioViewerControls').audioPlayerWaveformViewer('option', 'waveformEnd') - sampleOptions.trimStart;
                Mashup.MoveSampleToPlayer(sampleOptions, $self);
            }
            var options = $(ui.draggable.context).attr('data-sample-options');
            sampleOptions = JSON.parse(options);
            var $self = $(this);
            sampleOptions.track = Mashup.GetTrack($self);
            sampleOptions.rhythmIndex = Mashup.GetStartBeat($self);
            if(typeof sampleOptions.playDuration === 'undefined')
                sampleOptions.playDuration = sampleOptions.duration;
            Mashup.MoveSampleToPlayer(sampleOptions, $self);
        }
    },
    maxSampleLength: 41000 * 4 * 90,//41kHz * 32bits * number of seconds allowed
    mouseCaptureOffset: 0,
    mouseCapture: null,
    currentSlider: null,
    messageType: {
        Warning: '',
        Success: 'alert-success',
        Error: 'alert-error'
    },
    //sampleFilePath: 'http://mashandmixdev.commondatastorage.googleapis.com/samples/', //development path (has * for cors)
    numberRegEx: /(\d{1,5})/
};

Mashup.Player = { };    
//Global Display Error Message
Mashup.ShowMessage = function (title, message, type, prependTo) {
    Mashup.EndLoading();
    type = (typeof type === "undefined") ? Mashup.properties.messageType.Warning : type;
    var messageOptions = {
        Title: title,
        Message: message,
        AlertType: type
    };
    var template = $("#mashup-message-template").html();
    if (typeof prependTo === "undefined") {
        prependTo = '#main-content';
    }
    
    $(prependTo).prepend(_.template(template,messageOptions));
};
Mashup.GenericErrorMessage = function (jqXHR, textStatus, errorThrown) {
    Mashup.EndLoading();
    //close modals if visible
    $('.modal').modal('hide');
    switch (jqXHR.status) {
        case 400://bad request
            //Should have a response status. Parse into json, display message
            var responseJson = JSON.parse(jqXHR.responseText);
            Mashup.ShowMessage("Not so fast", responseJson.ResponseStatus.Message, Mashup.properties.messageType.Error);
            return false;
        case 401://unauthorized 
            Mashup.ShowMessage("Unauthorized", "You must be logged in to complete this action. Log in <a href='/Account/LogOn/' title='Log In' >here</a>", Mashup.properties.messageType.Warning);
            return false;
        default:
            var responseStatus = JSON.parse(jqXHR.responseText);
            if (responseStatus.ResponseStatus.ErrorCode == "BusinessServicesException") {
                Mashup.ShowMessage("Dang!", responseStatus.ResponseStatus.Message, Mashup.properties.messageType.Error);
                return false;
            }
            Mashup.ShowMessage("What the!", "Sorry, we could not process your request.  The error has been logged and we will do our best to correct the error asap.", Mashup.properties.messageType.Error);
            return false;
    }
};
//Use with graphical player
Mashup.MoveSampleToPlayer = function (sampleOptions, $playerDiv) {
    $playerDiv.droppable("destroy");

    var sample = $playerDiv.audioSampleGraphical(sampleOptions);

    //If sample did not initiate due to error, show error and skip adding the sample to player
    if (!sample.audioSampleGraphical('getInitiated')) {
        sample.audioSampleGraphical('destroy');
        Mashup.ShowMessage("Schnikes!", "The sample overlaps another sample on the same track.  Please find a shorter sample or place the sample on a different track.");
    }
    else {
        Mashup.Player.audioPlayerGraphical('addSample', sample);
    }
};

Mashup.GetTrack = function ($playerDiv) {
    var playerTrack = $playerDiv.parent();    
    return $('.player').find('.track').index(playerTrack);
};

Mashup.GetStartBeat = function ($playerDiv) {
    //Calculate left position of playerdiv by aggregating beats before it. 
    //Get playerTrack. Start at beginning
    var playerTrack = $playerDiv.parent();
    var playerNdx = playerTrack.find('[class*="span"]').index($playerDiv);
    var aggregateWidth = 0;
    var ndx = 0;

    //first span
    var currBeat = playerTrack.find(':first-child');
    //Aggregate widths until we get to our div
    while (ndx != playerNdx) {
        aggregateWidth += currBeat.outerWidth();
        currBeat = currBeat.next();
        ndx++;
    }
    var numOfLoopBeats = Mashup.Player.audioPlayerGraphical('option', 'numberOfLoopBeats');
    var beatIncrement = Mashup.Player.audioPlayerGraphical('option', 'beatIncrement');
    var trackWidth = playerTrack.width();
    return Math.round(aggregateWidth / trackWidth * numOfLoopBeats * beatIncrement);
};

Mashup.GetSamples = function () {
    var url = '/api/samples?format=json', selectedDiv = $('#selectedSampleTags'), bpm = $('#PlayerBpm').val();
    Mashup.StartLoading('Loading samples...');
    //Get artistIds and tagIds
    var artists = selectedDiv.children('.artistId');
    var tags = selectedDiv.children('.tagId');
    var artistIds = [], tagIds = [];
    for (var j = 0; j < artists.length; j++) {
        artistIds.push(artists.eq(j).attr('data-id'));
    }
    for (var k = 0; k < tags.length; k++) {
        tagIds.push(tags.eq(k).attr('data-id'));
    }
    var postData = {
        Bpm: bpm,
        ArtistIds: artistIds,
        TagIds: tagIds,
        PageIndex: $('#pageIndex').val(),
        PageSize: $('#pageSize').val()
    };
    //get updated songs
    $.ajax({
        url: url,
        data: postData, 
        type: 'POST',
        traditional: true,
        success: function (data, textStatus, jqXHR) {
            var sampleTemplate = _.template($("#mashup-songlist-template").html());
            var samples = $('#samples');
            samples.empty();
            _.each(data.SampleList, function (sample) {
                samples.append(sampleTemplate(sample));
            });
            $('#samplesAdded').val(data.SamplesAdded);

            //Put Draggable on new objects
            samples.children('li').draggable(Mashup.properties.draggableDefaultOptions);
            Mashup.AdjustPagers();
            Mashup.EndLoading();
            return false;
        },
        error: Mashup.GenericErrorMessage
    });
};
Mashup.AdjustPagers = function () {
    var pageNdx = parseInt($('#pageIndex').val());
    var pageSize = parseInt($('#pageSize').val());
    var samplesAdded = parseInt($('#samplesAdded').val());
    var numSamples = $('#samples li').length;
    if (pageNdx === 0 && samplesAdded > 0) {
        $('.next').hide();
        if (numSamples === pageSize) {
            $('.previous').show();
            return;
        }
        $('.previous').hide();
        return;
    }
    if (pageNdx <= 0 && numSamples < pageSize) {
        $('.previous').hide();
    }
    else {
        $('.previous').show();
    }
    if (pageNdx >= 0 && numSamples < pageSize) {
        $('.next').hide();
    }
    else {
        $('.next').show();
    }

};
Mashup.StartLoading = function(message) {
    var text = "Loading...Please Wait";
    if (typeof (message) !== 'undefined')
        text = message;
    $('#loading span').text(text);
    $('#loading').show();
    $('body').css('cursor', 'wait');
};
Mashup.EndLoading = function() {
    $('#loading').hide();
    $('body').css('cursor', 'default');
};
Mashup.GetParameterByName = function(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)')
        .exec(window.location.search);

    return match && decodeURIComponent(match[1].replace( /\+/g , ' '));
};
// Test for the Web Audio API <http://chromium.googlecode.com/svn/trunk/samples/audio/specification/specification.html>
Mashup.webAudioApi =  function () {
    return !(window.webkitAudioContext || window.AudioContext);
};
Mashup.isFloat = function(n) {
    return n === +n && n !== (n | 0);
};
Mashup.GetFormInput = function (formName) {
    var model = {};
    $.each($('#' + formName).serializeArray(), function (i, field) {
        if (field.name.indexOf(".") >= 0) {
            field.name = field.name.substring(field.name.indexOf(".") + 1, field.name.length);
        }
        model[field.name] = field.value;
    });
    return model;
};


