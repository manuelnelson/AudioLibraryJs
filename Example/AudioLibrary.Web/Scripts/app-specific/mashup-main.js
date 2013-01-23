/// <reference path="mashup.global.js" />
/// <reference path="mashup-dsp.js" />
/// <reference path="../jquery-1.8.2.intellisense.js" />
;$(document).ready(function () {
    if ($('.player').length > 0) {
        //Plugin code!!!
        //Draggable
        $('.sampleList li').draggable(Mashup.properties.draggableDefaultOptions);

        try {
            Mashup.Player = $('.player').audioPlayerGraphical({
                bpm: 100,
                stopButton: '#playerStop',
                saveButton: '#playerSave',
                playButton: '#playerPlay',
                clearButton: '#playerReset'
            });
        } catch(ex) {
            Mashup.ShowMessage("Uh oh!", ex, Mashup.properties.messageType.Error);
    }
    //plug-in for viewer
    $('#sampleWaveform').audioViewer({
        playButton: '#samplePlay',
        zoomInButton: '#sampleZoomIn',
        zoomOutButton: '#sampleZoomOut',
        dropFileBox: '#sampleTrim'
    });

    $('#waveformSample').draggable({
        revert: 'invalid',
        cursorAt: {
            left: 85
        },
        helper: function (event) {
            var clone = $(this).clone();
            var ndx = $(clone).text().indexOf('(');
            $(clone).text($(clone).text().substr(0, ndx));
            var sampleClone = $("<li />")
                .append(clone)
                .addClass('sampleSelected');
            return sampleClone;
        }
    });
        //Non-plugin code

        //When loading home page, we need to check if we are coming back from a save page. 
        //If so, we need to load the player, then bring up the save dialog
        if (Mashup.GetParameterByName('saveMix') === "true") {
            var mix = $.jStorage.get('latestUserMix');
            var distinctSampleIds = $.jStorage.get('latestSampleIds');
            Mashup.Player.audioPlayerGraphical('loadMix', mix);
            $('#MashupJson').val(mix);
            $('#SampleIds').val(distinctSampleIds);
            $('#saveModal').modal('show');
        }

        //function to save the mash
        //$('#saveMash').click(function () {
        //    if (!$('#addMashup').valid()) {
        //        return false;
        //    }
        //    if (!validTags()) {
        //        return false;
        //    }
        //    $('#saveMessage').show();
        //    var name = $('#Name').val();
        //    var mashupJson = $('#MashupJson').val();
        //    var tags = [];
        //    var distinctIds = $('#SampleIds').val().split(",");
        //    $.each($('#selectedTags').children(), function (ndx, item) {
        //        tags.push($(item).attr('data-id'));
        //    });
        //    var postData = {
        //        Name: name,
        //        MashupJson: mashupJson,
        //        Tags: tags,
        //        SampleIds: distinctIds
        //    };
        //    $.ajax({
        //        type: 'POST',
        //        data: postData,
        //        url: '/api/mashups?format=json',
        //        traditional: true,
        //        success: function (data) {
        //            $('#saveMessage').hide();
        //            $('#Name').val('');
        //            $('#selectedTags').empty();
        //            $('#hiddenTags').empty();
        //            $('#mashId').val(data.Mashup.Id);
        //            $('#playerSave').text('Update');
        //            $('#saveModal').modal('hide');
        //            Mashup.ShowMessage("Success", "Your mash was successfully saved.", Mashup.properties.messageType.Success);
        //        },
        //        error: Mashup.GenericErrorMessage
        //    });
        //});

 
        //Set up audio control panel
        $('.slider-thumb').audioControl();
        $('#sampleSugar .icon-remove').click(function () {
            $('#sampleSugar').slideUp(500); // Hide - slide up.
            $('.player .sample').removeClass('edit');
        });

        //handle pager functionality
        $('.previous').click(function () {
            var pageNdx = $('#pageIndex');
            var currNdx = pageNdx.val();
            pageNdx.val(currNdx - 1);
            Mashup.GetSamples();
            return false;
        });
        $('.next').click(function () {
            var pageNdx = $('#pageIndex');
            var currNdx = parseInt(pageNdx.val());
            pageNdx.val(currNdx + 1);
            Mashup.GetSamples();
            return false;
        });
        $('#resizeHandle').myResizable({
            resizeElement: $('#samples')
        });
    }


});