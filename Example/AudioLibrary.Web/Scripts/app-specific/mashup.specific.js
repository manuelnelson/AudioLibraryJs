//this file is for mashandmix only.  Not to be included in opensource
$(document).ready(function () {
    //global
    //dropdown (I shouldn't actually need this
    $('.dropdown-toggle').dropdown();

    //Fetch login status and update login template
    $.ajax({
        url: '/api/UserProfile?format=json',
        success: function (data) {
            var loginTempalte = $("#mashup-login-template").html();
            $('#main-nav').append(_.template(loginTempalte, data.Result));
        },
        error: Mashup.GenericErrorMessage
    });

    //Modify Validation on forms to cross-over to twitter bootstrap
    var $forms = $('form');
    var oldErrorFunction = [], oldSucessFunction = [], oldInvalidHandler = [];
    for (var f = 0; f < $forms.length; f++) {
        var settings = $.data($forms[f], 'validator').settings;
        oldErrorFunction[f] = settings.errorPlacement;
        oldSucessFunction[f] = settings.success;
        oldInvalidHandler[f] = settings.invalidHandler;
        settings.formNdx = f;
        settings.errorPlacement = function (error, inputElement) {
            $(inputElement).closest('.control-group').addClass('error');
            if (!$.data($forms[this.formNdx], 'validator').valid()) {
            }
            oldErrorFunction[this.formNdx](error, inputElement);
        };
        settings.success = function (error) {
            $(error).closest('.control-group').removeClass('error');
            oldSucessFunction[this.formNdx](error);
        };
        settings.invalidHandler = function (error) {
            oldInvalidHandler[this.formNdx]();
        };
    }

    //This is our audio player. Plays samples and mashups
    $('.playAudio').on('click', function () {
        var $self = $(this);
        var html5Player = $('#samplePlayer').get(0);
        if ($self.children('i').hasClass('icon-play')) {
            //First, if any samples were already playing, let's pause them visually
            $('.playAudio').children('i').removeClass('icon-pause').addClass('icon-play');
            //now show that the sample is loading
            $self.children('i').removeClass('icon-play').addClass('icon-refresh');
            //retrieve source
            var src;
            if ($self.hasClass('audioSample')) {
                var optionsString = $(this).parent().attr('data-sample-options');
                var options = JSON.parse(optionsString);
                src = Mashup.properties.sampleFilePath + options.fileName;
            } else {
                src = $self.attr('data-src');
            }
            //use html5 player to play
            $(html5Player).attr('src', src);
            html5Player.load();
            html5Player.volume = 1.0;
            $(html5Player).bind('canplaythrough', function () {
                $self.children('i').removeClass('icon-refresh').addClass('icon-pause');
                html5Player.play();
                $('title').text('▶ ' + $('title').text());
            });
        } else {
            html5Player.pause();
            $('title').text($('title').text().replace(/▶/g, ''));
            $self.children('i').removeClass('icon-pause').addClass('icon-play');
            $(html5Player).unbind('canplaythrough');
        }
        $('#samplePlayer').bind('ended', function () {
            $self.children('i').removeClass('icon-pause').addClass('icon-play');
            $(html5Player).unbind('canplaythrough');
        });
    });

    //With no link, we don't need to customize this.
    $('.help').popover({
        title: $(this).attr('data-title'),
        content: $(this).attr('data-content'),
        placement: $(this).attr('data-placement') ? $(this).attr('data-placement') : 'right',
        trigger: 'manual',
    }).click(function (evt) {
        evt.stopPropagation();
        $(this).popover('show');
    });
    $('html').on('click.popover.data-api', function () {
        $('.help').popover('hide');
    });

    $(".js-video").fitVids();
    $('#logOff').on('click', function () {
        Mashup.StartLoading('Logging off...');
        $.ajax({
            url: '/api/auth/logout',
            success: function () {
                document.location.href = '/';
            },
            error: Mashup.GenericErrorMessage
        });
    });
    
    /*-----------------------Landing Page---------------------------*/
    //load recent mashups
    if ($('.recent-mashups').length > 0) {
        $.ajax({
            url: '/api/mashups/recent?format=json',
            success: function (data) {
                var mashupTemplate = _.template($("#mashup-mashup-template").html());
                var $mashups = $('#mashup-list');
                _.each(data.Mashups, function (mashup) {
                    $mashups.append(mashupTemplate(mashup));
                });

            },
            error: Mashup.GenericErrorMessage
        });
    }
    if ($('.recent-samples').length > 0) {
        $.ajax({
            url: '/api/samples/recent?format=json',
            success: function (data) {
                var sampleTemplate = _.template($("#mashup-songlist-template").html());
                var $samples = $('#samples');
                _.each(data.SampleList, function (sample) {
                    $samples.append(sampleTemplate(sample));
                });
            },
            error: Mashup.GenericErrorMessage
        });
    }


    /*-----------------------Home Page---------------------------*/
    if ($('.player').length > 0) {
        //Check if browser allows web api
        //if (Mashup.webAudioApi()) {
        //    Mashup.ShowMessage("D'oh!", 'This application requires a Web Audio API enabled browser.  Please download ' +
        //        '<a href="http://www.google.com/chrome" title="chrome" target="_blank">Chrome</a> ' 
        //                + 'to take part in the fun! (Trust me, its quick, painless and well worth it)');
        //    return;
        //}

        //Draggable
        $('.sampleList li').draggable(Mashup.properties.draggableDefaultOptions);

        //Droppable
        $('.player .track:not(:last-child) [class*="span"]').droppable(Mashup.properties.droppableDefaultOptions);
        var bpm = $('#PlayerBpm').val();
        Mashup.Player = $('.player').audioPlayerGraphical({
            bpm: bpm,
            NumberOfBeats: $('#measures').val() * 4
        });

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

        //When loading home page, we need to check if we need to load a mix.     
        if (Mashup.GetParameterByName('PlayMix') !== null) {
            $('#playerSave').hide();
            var mixId = Mashup.GetParameterByName('PlayMix');
            $('#mashId').val(mixId);
            Mashup.StartLoading("Retrieving mashup...");
            $.ajax({
                url: '/api/mashups/' + mixId + '?format=json',
                type: 'GET',
                success: function (data) {
                    if (data.Mashup.UserId !== parseInt($('#userId').val()))
                        $('#playerSave').remove();
                    else {
                        $('#playerSave').show();
                        $('#playerSave').text('Update');
                    }
                    var titleTemplate = $("#mashup-title-template").html();
                    $('.walkthrough-wrapper').empty().append(_.template(titleTemplate, data.Mashup));
                    Mashup.Player.audioPlayerGraphical('loadMix', data.Mashup.MashupJson);
                    Mashup.EndLoading();
                },
                error: Mashup.GenericErrorMessage
            });
        } else {
            //Lazyload samples
            Mashup.GetSamples();
        }

        //function to save the mash
        $('#saveMash').click(function () {
            if (!$('#addMashup').valid()) {
                return false;
            }
            if (!validTags()) {
                return false;
            }
            $('#saveMessage').show();
            var name = $('#Name').val();
            var mashupJson = $('#MashupJson').val();
            var tags = [];
            var distinctIds = $('#SampleIds').val().split(",");
            $.each($('#selectedTags').children(), function (ndx, item) {
                tags.push($(item).attr('data-id'));
            });
            var postData = {
                Name: name,
                MashupJson: mashupJson,
                Tags: tags,
                SampleIds: distinctIds
            };
            $.ajax({
                type: 'POST',
                data: postData,
                url: '/api/mashups?format=json',
                traditional: true,
                success: function (data) {
                    $('#saveMessage').hide();
                    $('#Name').val('');
                    $('#selectedTags').empty();
                    $('#hiddenTags').empty();
                    $('#mashId').val(data.Mashup.Id);
                    $('#playerSave').text('Update');
                    $('#saveModal').modal('hide');
                    Mashup.ShowMessage("Success", "Your mash was successfully saved.", Mashup.properties.messageType.Success);
                },
                error: Mashup.GenericErrorMessage
            });
        });

        $('#playerReset').click(function () {
            Mashup.Player.audioPlayerGraphical('stop');
            Mashup.Player.audioPlayerGraphical('reset');
        });

        //Tempo Change handler
        $('#PlayerBpm').focusout(function () {
            $('#pageIndex').val(0);
            $('#samplesAdded').val(0);
            var bpm = $(this).val();
            Mashup.Player.audioPlayerGraphical('option', 'bpm', bpm);
            Mashup.GetSamples();
        });

        $('#sampleSearch').typeahead({
            source: function (typeahead, query) {
                if (query === "") {
                    return typeahead.process([]);
                }
                var url = '/api/tags?Name=' + query + '&IncludeArtist=true&format=json';
                $.ajax({
                    url: url,
                    success: function (data) {
                        return typeahead.process(data.Tags);
                    },
                    error: Mashup.GenericErrorMessage
                });
            },
            property: "Name",
            onselect: function (tagObject) {
                //This is where we need to remove the object from the input, add a little block with the tag, and update the hidden elements
                $('#pageIndex').val(0);
                $('#samplesAdded').val(0);
                this.$element.val('');
                var selectedDiv = $('#selectedSampleTags');
                var type = tagObject.Type === 0 ? 'tagId' : 'artistId';
                selectedDiv.append("<span class='btn-mini btn tagButton " + type + "' data-id='" + tagObject.Id + "' >" + tagObject.Name + "<a class='close tagClose'>&nbsp;x</a></span>");
                Mashup.GetSamples();
            }
        });

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

    //Start walkthrough
    $('#walkthrough').click(function () {
        //create element to attach to 
        $('#content-no-footer').children(':first').prepend("<div id='walkthrough-container' class='row-fluid'></div>");
        $('#walkthrough-container').load('/Home/GetWalkthrough');
        $(this).hide();
    });
    if ($('#sampleWaveform').is(':visible')) {
        //If not visible, the viewer doesn't scale correctly
        $('#sampleWaveform').audioViewer({
            width: $('#sampleWaveform').width()
        });
    }
    //configure audioViewer
    $('#sampleWaveform').droppable({
        accept: '.sampleList li, .sample',
        hoverClass: 'hover',
        drop: function (event, ui) {
            $('#sampleTrim').removeClass('dotted');
            $("#audioViewerControls").show();
            var waveformSample = $('#waveformSample');
            waveformSample.addClass('dotted');
            var optionsString = $(ui.draggable.context).attr('data-sample-options');
            var options = JSON.parse(optionsString);
            waveformSample.attr('data-sample-options', optionsString);
            waveformSample.attr('data-waveform', 'true');
            waveformSample.text(options.sampleName + '  (Drag me to player when finished)');
            $('#sampleWaveform').audioViewer('loadSampleFromFileUrl', options.fileName, options.id, options.duration);
        }
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

    /*--------------------Samples-----------------*/
    //Typeahead for Samples
    $('#Artist').typeahead({
        source: function (typeahead, query) {
            //Clear out artistId to begin
            $('#ArtistId').val("");
            if (query === "") {
                return typeahead.process([]);
            }
            var url = '/api/artists?Name=' + query + '&format=json';
            $.ajax({
                url: url,
                success: function (data) {
                    return typeahead.process(data.Artists);
                },
                error: Mashup.GenericErrorMessage
            });
        },
        onselect: function (tagObject) {
            $('#ArtistId').val(tagObject.Id);
        },
        property: "Name"
    });

    $('#tagSelect').typeahead({
        source: function (typeahead, query) {
            if (query === "") {
                return typeahead.process([]);
            }
            var url = '/api/tags?Name=' + query + '&format=json';
            $.ajax({
                url: url,
                success: function (data) {
                    return typeahead.process(data.Tags);
                },
                error: Mashup.GenericErrorMessage
            });
        },
        property: "Name",
        onselect: function (tagObject) {
            //This is where we need to remove the object from the input, add a little block with the tag, and update the hidden elements
            this.$element.val('');
            var selectedDiv = $('#selectedTags');
            var hiddenDiv = $('#hiddenTags');
            var tagName = "Tags[" + selectedDiv.find('span').length + "]";
            selectedDiv.append("<span class='btn-mini btn tagButton' data-id='" + tagObject.Id + "'>" + tagObject.Name + "<a class='close tagClose'>&nbsp;x</a></span>");

            hiddenDiv.append("<input type='hidden' value='" + tagObject.Id + "' name='" + tagName + ".Id'/>");
            hiddenDiv.append("<input type='hidden' value='" + tagObject.Name + "' name='" + tagName + ".Name'/>");
        }
    });

    $('.tagClose').on('click', closeTag);

    function closeTag(ev, tag) {
        var $self = tag;
        console.log(typeof $self);
        if (typeof $self === 'undefined') {
            $self = $(this);
        }
        var ndx = $self.parent().index();
        $self.parent().remove();
        $("#hiddenTags input").eq(ndx * 2).remove();
        $("#hiddenTags input").eq(ndx * 2).remove();

        //This is the Player Page, update samples 
        if ($('.track').length > 0) {
            Mashup.GetSamples();
            return;
        }
        //re number
        var hidden = $("#hiddenTags input");
        for (var j = 0; j < hidden.length; j++) {
            if (j % 2) {
                hidden.eq(j).attr('name', 'Tags[' + (j - 1) / 2 + "].Name");
            } else {
                hidden.eq(j).attr('name', 'Tags[' + j / 2 + "].Id");
            }
        }
    }

    //on page load, if the form already has tags (hidden), this will add the visible tags to the form.
    for (var i = 0; i < $('#hiddenTags input').length; i++) {
        if ($("#hiddenTags input").eq(i).attr('name').indexOf("Name") > -1) {
            var val = $("#hiddenTags input").eq(i).val();
            $('#selectedTags').append("<span class='btn-mini btn tagButton'>" + val + "<a class='close tagClose'>&nbsp;x</a></span>");
        }
    }
    if ($('#tagWidget').length > 0) {
        //load popular tags
        $.ajax({
            url: '/api/tags/all?format=json',
            type: 'GET',
            success: function (data) {
                var $row = $('<div class="row-fluid">');
                $('#tagWidget').append($row);
                for (var i = 0; i < data.Tags.length; i++) {
                    if (i % 3 == 0) {
                        $row = $('<div class="row-fluid">');
                        $('#tagWidget').append($row);
                    }
                    $row.append('<span class="span5">' + data.Tags[i].Name + '</span>');
                }
            },
            error: Mashup.GenericErrorMessage
        });
    }

    $('#addSamples #Name').focusout(getSongBpm);
    $('#addSamples #Artist').focusout(getSongBpm);
    function getSongBpm() {
        var song = $('#Name').val(), artist = $('#Artist').val();
        if (song != "" && artist != "") {
            //retrieve song bpm from echonest api
            $.ajax({
                //url: '/api/samples?Name=' + song + '&Artist=' + artist + '&format=json',
                url: '/api/samples/' + song + '/' + artist + '?format=json',
                type: 'GET',
                success: function (data) {
                    //song exists in echonest db.  Get bpm using this id                    
                    if (Mashup.isFloat(data) && data !== 0) {
                        $('#Bpm').val(data);
                    } else if (data !== 0) {
                        //we got list of possible duplicate samples. show this list. extract bpm from it                        
                        var samples = $('#samples');
                        $('#Bpm').val(data.SampleList[0].Bpm);
                        var buyLink = '';
                        $.each(data.SampleList, function (ndx, item) {
                            if (item.BuyLink)
                                buyLink = item.BuyLink;
                        });
                        $('#BuyLink').val(buyLink);
                        var sampleList = $("#mashup-songlist-template").html();
                        samples.empty();
                        samples.append(_.template(sampleList, data.SampleList));
                        $('#duplicate-samples').show();
                    } else {
                        //let user know bpm failed.  ask user to try to calc it him/herself before we try to upload
                        var query = $('#Artist').val() + ' ' + $('#Name').val() + ' bpm';
                        Mashup.ShowMessage("Unable to find Bpm.", " Use <span class='beatBpmCalc link'>our Bpm tool</span> to help, or <a href='http://www.all8.com/tools/bpm.htm' target='_blank'>this tool</a>, or use <a href='http://google.com/#q=" + query + "' target='_blank'>google</a> to find the bpm for the song.");
                    }

                },
                error: Mashup.GenericErrorMessage
            });
        }
    }

    $('.beatBpmCalc').on('click', function () {
        $('#beatCalculator').show();
        $('#beatsUpdated').hide();
        $('#Beats').val('');
    });
    $('#Beats').focusin(function () {
        $('#beatsUpdated').hide();
    });
    $('#beatCalculateSubmit').on('click', function () {
        var numBeats = parseFloat($('#Beats').val());
        var bpm = $('#sampleWaveform').audioViewer('calculateBpm', numBeats);
        $('#Bpm').val(bpm);
        $('#beatsUpdated').show();
        $('#Beats').val('');
    });
    $('.widget .close').on('click', function () {
        $(this).parent().hide();
    });
    function validTags() {
        if (!($('input[name="Tags[0].Id"]').length > 0 && $('input[name="Tags[5].Id"]').length == 0)) {
            $('span[data-valmsg-for="Tags"]').append('<span for="Tags">1-5 tags required</span>');
            $('span[data-valmsg-for="Tags"]').parent().addClass('error');
            $('span[data-valmsg-for="Tags"]').removeClass().addClass('field-validation-error help-inline');
            $('.typeahead').on('click', function () {
                if ($('input[name="Tags[0].Id"]').length > 0 && $('input[name="Tags[5].Id"]').length == 0) {
                    $('span[data-valmsg-for="Tags"]').empty();
                    $('span[data-valmsg-for="Tags"]').parent().removeClass('error');
                    $('span[data-valmsg-for="Tags"]').removeClass('field-validation-error help-inline').addClass('field-validation-valid');
                }
            });
            return false;
        }
        return true;
    }

    $('#saveSample').click(function () {
        if ($('#addSamples').valid()) {
            if (!validTags()) {
                return false;
            }
            //also need to check if tags are valid (e.g. there are at least 1-5 tags)
            Mashup.StartLoading("Equalizing song...");
            try {
                var buffer = $('#sampleWaveform').audioViewer('getFinalSampleBuffer');
            }
            catch (ex) {
                Mashup.ShowMessage(ex);
                return false;
            }

            var request = new XMLHttpRequest();
            request.open("post", "/Samples/SaveSample/", true);
            Mashup.StartLoading("Uploading song...");
            request.onreadystatechange = function () {
                if (request.readyState == 4 && request.status == 200) {
                    callback(request.responseText);
                } else if (request.readyState == 4 && request.status != 200) {
                    Mashup.ShowMessage("No Way Jose", "There was a problem saving the sample");
                }
            };
            // Send the file
            request.send(buffer);
        }
    });
    function callback(data) {
        Mashup.StartLoading("Sending song info...");
        if (data.indexOf(">") > 0) {
            //Something done gone wrong
            Mashup.ShowMessage("Sorry!", "We encountered an error uploading your sample.  Please try uploading again");
            return;
        }
        var fileName = data;
        var tags = $("#selectedTags .tagButton");
        var tagIds = [];
        var isAcapella = false;
        for (var j = 0; j < tags.length; j++) {
            tagIds.push(tags.eq(j).attr('data-id'));
            if (tags.eq(j).text().trim() === "Acapella")
                isAcapella = true;
        }

        var artistId = $("#ArtistId").val() === '' ? 0 : $("#ArtistId").val();
        var bpm = parseFloat($("#Bpm").val());
        if (isNaN(bpm)) {
            //no value supplied
            bpm = -1;
        } else if (!isAcapella) {
            //don't improve bpm if it is an acapella (measures thing doesn't work) or if we currently don't have a Bpm
            bpm = improveBpm(bpm);
        }
        var sample = {
            Title: $("#Name").val(),
            ArtistId: artistId,
            Name: $("#Artist").val(),
            Bpm: bpm,
            TagIds: tagIds,
            FileName: fileName,
            BuyLink: $('#BuyLink').val()
        };
        $.ajax({
            url: "/api/samples/add?format=json",
            type: "POST",
            traditional: true,
            data: sample,
            success: function (data) {
                Mashup.EndLoading();
                var message = "Song " + data.Title + " by " + data.Name + " was successfully added! <a id='clearSampleForm'>Click to start with a new " +
                    "song</a>";
                Mashup.ShowMessage("Successfully added!", message, Mashup.properties.messageType.Success);
            },
            error: Mashup.GenericErrorMessage
        });
    }

    var possibleBeats = [4, 8, 12, 16, 24, 32];
    //Tries to get a more accurate bpm using the duration of the sample and testing if sample is a loop.
    function improveBpm(currBpm) {
        for (var i = 0; i < possibleBeats.length; i++) {
            var possibleBpm = $('#sampleWaveform').audioViewer('calculateBpm', possibleBeats[i]);
            if (Math.abs(possibleBpm - currBpm) < Mashup.properties.bpmDelta) {
                return possibleBpm;
            }
        }
        return currBpm;
    }
    // Setup the drag and drop listeners.
    var $box = $("#dropBox");
    $box.bind("dragover", dragEnter);
    $box.bind("dragleave", dragLeave);
    $box.bind("drop", drop);

    //drag and drop file
    function drop(e) {
        e.stopPropagation();
        e.preventDefault();
        Mashup.StartLoading("Loading and drawing song....");
        $('#duplicate-samples').hide();
        $('h3.dropBox').show();
        $(e.target).removeClass('over');
        var files = e.originalEvent.dataTransfer.files;

        //process upload
        if (files.length > 0) {
            if (window.FormData !== undefined) {
                var file = files[0];
                if (file.type !== "audio/mp3" && file.type !== "audio/ogg") {
                    Mashup.ShowMessage("Invalid File Type", "File must be an .mp3 or .ogg file", Mashup.properties.messageType.Error);
                    Mashup.EndLoading();
                    return;
                }
                var reader = new FileReader();
                reader.onloadend = function (e) {
                    Mashup.EndLoading();
                    $('#sampleWaveform').audioViewer('loadSampleFromArrayBuffer', this.result);
                };
                reader.readAsArrayBuffer(file);
            } else {
                Mashup.ShowMessage("D'oh!", 'This application requires a File API enabled browser.  Please download ' +
                '<a href="http://www.google.com/chrome" title="chrome" target="_blank">Chrome</a> '
                        + 'to take part in the fun! (Trust me, its quick, painless and well worth it)');
                Mashup.EndLoading();
            }
        }
    }

    function dragEnter(e) {
        //clear previous files if any
        if (e.originalEvent.dataTransfer.files.length > 0)
            e.dataTransfer.dropEffect = 'drop'; // Explicitly show this is a copy.
        $(e.target).addClass('over');
        $('h3.dropBox').hide();
        if (!$('#sampleWaveform').is(':visible')) {
            $('#audioViewer').show();
            $('#audioViewerControls').show();
            $('#sampleWaveform').audioViewer({
                width: $('#sampleWaveform').width()
            });
        }
        return false;
    }
    function dragLeave(e) {
        //e.stopPropagation();
        //e.preventDefault();
        $(e.target).removeClass('over');
        $('h3.dropBox').show();
        return false;
    }

    $('#clearSampleForm').on('click', function () {
        $("#Name").val('');
        $("#Artist").val('');
        $("#Bpm").val('');
        $("#BuyLink").val('');
        $('#duplicate-samples').hide();
        var tags = $("#selectedTags .tagClose");
        $.each(tags, function (ndx, item) {
            closeTag(null, $(item));
        });
        $(this).parent().remove();
        $('#sampleWaveform').audioViewer('clear');
    });
    //    /*----------------------Profile-----------------------*/
    //HHHUUGGEE HACK... Maybe find some other way later but for now this works
    $('#facebookPic').mousemove(function (e) {
        //$('li#facebookPic').css('background-color', '');
        $('#facebookPic a').css('background-color', '#699BC8');
        $('#facebookPic a').css('color', '#fff');
    });
    $('#lnkGravatarPic').mouseover(function () {
        $('#facebookPic a').css('background-color', '#fff');
        $('#facebookPic a').css('color', '#333');
    });
    $('#lnkGravatarPic').mouseout(function () {
        $('#facebookPic a').css('background-color', '#699BC8');
        $('#facebookPic a').css('color', '#fff');
    });

    //Setup sample preview
    $('.playMix').on('click', function () {
        var $self = $(this);
        if ($self.children('i').hasClass('icon-play')) {
            $self.children('i').removeClass('icon-play').addClass('icon-refresh');

            //use html5 player for this
            var audioElement = $('#samplePlayer').get(0);
            $(audioElement).attr('src', src);
            audioElement.load();
            $(audioElement).bind('canplaythrough', function () {
                $self.children('i').removeClass('icon-refresh').addClass('icon-pause');
                audioElement.play();
            });
        }
        else {
            $('#samplePlayer')[0].pause();
            $self.children('i').removeClass('icon-pause').addClass('icon-play');
            var audioElement = $('#samplePlayer').get(0);
            $(audioElement).unbind('canplaythrough');
        }
        $('#samplePlayer').bind('ended', function () {
            $self.children('i').removeClass('icon-pause').addClass('icon-play');
            var audioElement = $('#samplePlayer').get(0);
            $(audioElement).unbind('canplaythrough');
        });
    });

    //GetGravatar
    $('#lnkGravatarPic').click(function () {
        var url = $(this).attr('data-action-url');
        $.ajax({
            url: url,
            success: function (data) {
                var width = $('#profilePicContainer').width();
                $('#profilePic').attr('src', data.GravatarUrl + "?s=" + width);
            },
            error: Mashup.GenericErrorMessage
        });
    });

    $('#facebookPic').click(function () {
        var url = $(this).attr('data-action-url');
        var currentHref = document.location.href;
        $.ajax({
            url: url,
            success: function (data) {
                if (data.FacebookUrl == "Not logged in Facebook") {
                    $('#facebook-profile').submit();
                } else {
                    var width = $('#profilePicContainer').width();
                    $('#profilePic').attr('src', data.FacebookUrl + "?type=large");
                }
            },
            error: Mashup.GenericErrorMessage
        });
    });

    //like a mashup
    $('.mashup-vote').on('click', function () {
        var listItem = $(this).parent();
        var currentCount = parseInt(listItem.children('.vote-count').text());
        var mashupId = $(this).attr('data-id');
        var data = {
            mashupId: mashupId
        };
        $.ajax({
            url: '/api/vote/?format=json',
            type: 'POST',
            data: data,
            success: function (data) {
                if (typeof data.Message != "undefined" && data.Message.length > 0) {
                    Mashup.ShowMessage("Whoopsies", data.Message);
                    return false;
                }
                listItem.children('.vote-count').text(currentCount + 1);
                return false;
            },
            error: Mashup.GenericErrorMessage
        });

    });

    //Show more descriptive sample information.  Make editable if sample was added less than a day ago
    var sampleChildNdx;
    $('.recentSample').on('click', function () {
        var sampleOptions = JSON.parse($(this).attr('data-sample-options'));
        sampleChildNdx = $(this).index();
        $('#sampleArtist').text(sampleOptions.artist);
        $('#sampleBpm').text(sampleOptions.bpm);
        $('#sampleName').text(sampleOptions.sampleName);
        $('#sampleId').val(sampleOptions.id);
        if (sampleOptions.BuyLink === "")
            $('.buyLink').hide();
        else {
            $('#sampleBuyLink').text(sampleOptions.BuyLink);
            $('.buyLink').show();
        }
        //Only allow edits if user is logged in (in which case the editDeleteSample is available)
        if ($('#editDeleteSample').length > 0) {
            var jscriptDate = new Date(sampleOptions.dateAdded);
            var yesterdaysDate = new Date();
            //User gets 1 day to edit or delete sample (this is to avoid deletions when sample is being used in other mashups)
            yesterdaysDate.setDate(new Date().getUTCDate() - 1);
            if (jscriptDate > yesterdaysDate) {
                //show buttons
                $('#editDeleteSample').show();
            }
        }
        $('.sampleInfo').show();
    });

    //Wire edit sample events
    $('#sampleEdit').click(function () {
        if ($('#sampleEdit').text() === 'Edit') {
            showEditBpm();
        } else {
            finishEditBpm();
        }
    });

    function showEditBpm() {
        var bpm = $('#sampleBpm').text();
        var beatsSpan = $('#sampleBpm');
        beatsSpan.hide();
        var input = "<input type='text' id='sampleBpmEdit' class='input-mini' value='" + bpm + "'></input>";
        beatsSpan.before(input);
        $('#sampleEdit').text('Done');
    }

    function finishEditBpm() {
        Mashup.StartLoading();
        $('#sampleEdit').text('Edit');
        var newBpm = parseFloat($('#sampleBpmEdit').val());
        if (typeof (newBpm) !== 'undefined') {
            $.ajax({
                url: '/api/samples/',
                type: 'PUT',
                data: {
                    Id: $('#sampleId').val(),
                    Bpm: newBpm
                },
                success: function () {
                    $('#sampleBpmEdit').remove();
                    $('#sampleBpm').text(newBpm);
                    $('#sampleBpm').show();
                    //update json on list item
                    var sampleOptions = JSON.parse($('.sampleList li:eq(' + sampleChildNdx + ')').attr('data-sample-options'));
                    sampleOptions.bpm = newBpm;
                    $('.sampleList li:eq(' + sampleChildNdx + ')').attr('data-sample-options', JSON.stringify(sampleOptions));
                    Mashup.EndLoading();
                    return false;
                },
                error: Mashup.GenericErrorMessage
            });
        }
        else {
            $('#sampleLengthEdit').remove();
            $('#sampleBeats').text(this.numberOfBeats + ' beats');
            Mashup.ShowMessage("Shoot!", "Length must be an integer");
            return;
        }
    }

    $('#DeleteSample').on('click', function () {
        Mashup.StartLoading();
        $.ajax({
            url: '/api/samples/' + $('#sampleId').val() + '/Delete',
            type: 'DELETE',
            success: function () {
                //update json on list item
                $('.sampleList li:eq(' + sampleChildNdx + ')').remove();
                $('.sampleInfo').hide();
                Mashup.EndLoading();
                return false;
            },
            error: Mashup.GenericErrorMessage
        });
    });
    //if mashup list is less than 20, remove load more
    if ($('#mashup-list li').length < 20) {
        $('#load-more').remove();
    }
    $('#load-more').on('click', function () {
        //increment the page index
        var pageNdx = parseInt($('#pageIndex').val()) + 1;
        var userId = parseInt($('#profileId').val());
        $.ajax({
            url: '/api/mashups/' + userId + '/' + pageNdx + '/' + 20 + '/?format=json',
            data: data,
            type: 'GET',
            success: function (data) {
                $('#pageIndex').val(pageNdx);
                $('#mashup-list li:last-child').remove();
                $('#mashup-list').append(_.template($("#mashup-mashup-template").html(), data.Mashups));
                if (data.Mashups.length == 20) {
                    $('#mashup-list').append("<li id='load-more'>-Load More-</li>");
                }
            },
            error: Mashup.GenericErrorMessage
        });
        return false;
    });
    /*-----------------------Help----------------------------*/
    $('.youtube').click(function () {
        var contentContainer = $('#learn-content');
        contentContainer.empty();
        var src = $(this).attr('data-src');
        contentContainer.append("<div class='js-video'><iframe src='" + src + "' type='text/html' frameboarder='0' allowfullscreen></iframe></div>");
        $(".js-video").fitVids();
        return false;
    });
    $('.ajax-content').click(function () {
        var contentContainer = $('#learn-content');
        contentContainer.empty();
        var ajaxUrl = $(this).attr('data-url');
        contentContainer.load('/Learn/GetSafariInstructions');
        //return false;
    });
    $('.tabbable li').click(function () {
        var contentContainer = $('#learn-content');
        contentContainer.empty();
    });
    /*-----------------------Register----------------------------*/
    $('#register input[type=submit]').click(function (e) {
        if (e) e.preventDefault();
        var form = $('#register');
        if (form.valid()) {
            Mashup.StartLoading("Registering...Please wait");
            $.ajax({
                type: 'POST',
                url: form.attr('action') + '?format=json',
                data: Mashup.GetFormInput('register'),
                success: function (data) {
                    document.location.href = '/';
                    Mashup.EndLoading();
                },
                error: Mashup.GenericErrorMessage
            });
        }
    });
    /*-----------------------Login----------------------------*/
    $('#login-form input[type=submit]').click(function (e) {
        if (e) e.preventDefault();
        var form = $('#login-form');
        var redirect = form.attr('data-continue');
        if (form.valid()) {
            Mashup.StartLoading("Logging in...Please wait");
            $.ajax({
                type: 'POST',
                url: form.attr('action') + '?format=json',
                data: Mashup.GetFormInput('login-form'),
                success: function () {
                    document.location.href = redirect;
                    Mashup.EndLoading();
                },
                error: Mashup.GenericErrorMessage
            });
        }
    });
    //this will configure the continue paths for successful logins
    if ($('.openid-login').length > 0) {
        var continueUrl = Mashup.GetParameterByName('Continue');
        if (!continueUrl) {
            continueUrl = '/Player/';
        }
        $.each($('.continueUrl'), function (ndx, item) {
            var currentAction = $(item).attr('action');
            $(item).attr('action', currentAction + '?continue=' + continueUrl);
        });

        $('#login-form').attr('data-continue', continueUrl);
    }
});