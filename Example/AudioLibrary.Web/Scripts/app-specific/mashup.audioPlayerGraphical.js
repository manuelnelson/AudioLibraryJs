; (function ($, window, document, undefined) {

  $.widget("Mashup.audioPlayerGraphical", $.Mashup.audioPlayer, {

        //Options to be used as defaults
        options: {
            bpm: 115,
            playButton: null,
            stopButton: null,
            clearButton: null,
            saveButton: null,
            numberOfLoopBeats: 16,
            rhythmIndex: 0,
            beatIncrement: 4, //4 = 16th note, 2 = 8th note, 1 = quarter note, etc.
            tracks: 5
        },
         
        _currentBeat: 0,
        _previousBeat: 0,
        //Number of beats visible at a time
        _viewableBeats: 16,
        _create: function () {
            //call base class create
            this.isGraphical = true;
            $.Mashup.audioPlayer.prototype._create.call(this);

            var self = this;
  
            //------------Wire up player buttons----------------------//
            this._stop = $(this.options.stopButton);
            if (this._stop.length < 1)
                throw "Stop button does not exist";
            this._stop.click(function() {
                self.stop();
            });
            
            this._save = $(this.options.saveButton);
            if (this._save.length < 1)
                throw "Save button does not exist";
            this._save.click(function () {
                self.savePlayer(this);
            });

            this._toggle = $(this.options.playButton);
            if (this._toggle.length < 1)
                throw "Play button does not exist";
            this._toggle.click(function () {
                self.togglePlay();
            });
            
            this._clear = $(this.options.clearButton);
            if (this._clear.length < 1)
                throw "Clear button does not exist";
            this._clear.click(function () {
                self.reset();
            });
            
            //Allow pause/play using spacebar
            $('body').keydown(function(e) {
                if (e.which === 32) {
                    if (e.target.tagName.toUpperCase() === 'INPUT') return;
                    e.preventDefault();

                    self.togglePlay();
                }
            });

            //Handle autoscrolling
            self._autoScroll = false;
            $('#toggle-autoscroll').click(function () {
                self._autoScroll = $(this).is(':checked');                    
            });
            
            //Setup graphical tracks
            this._setupTracks();

            //Add click on beat function
            $('.track:last-child .span1').on('click',function() {
                self.pause();
                var currentBeat = $('.track:last-child .span1').index(this) + 1;
                self.rhythmIndex = currentBeat * self.options.beatIncrement-1;
                self._drawNote();
                self._advanceNote();
            });
        },  
                
        _addTrack: function () {
            $.Mashup.audioPlayer.prototype._addTrack.call(this);
            var track = $("<div />").addClass('track row-fluid');
            var beat = "<div class='span1'></div>";
            for (var i = 0; i < this.options.numberOfLoopBeats; i++) {
                track.append(beat);
            }
            $(this.element[0]).append(track);
        },
        _drawNote: function () {
            //Draw Note
            var ndx = this.rhythmIndex + 1;

            //last track will be for drawing
            if(!(ndx % this.options.beatIncrement)) {                
                this._currentBeat = ndx / this.options.beatIncrement;                
                this.$player.find('.track:last-child .span1:nth-child(' + this._previousBeat + ')').removeClass('onBeat');
                this.$player.find('.track:last-child .span1:nth-child(' + this._currentBeat + ')').addClass('onBeat');                
                this._previousBeat = this._currentBeat;

                //check if beat indicator has become hidden.  If so, scroll over by player width
                if (!this._autoScroll) return;
                var self = this;
                var xPositionBeat = this.$player.find('.track:last-child .onBeat').position().left;
                if (xPositionBeat > this.$player.width()) {
                    self._autoScrolling = true;
                    this.$player.animate({
                        scrollLeft: $player.scrollLeft() + this.$player.width()
                    }, 50);
                }
                else if(xPositionBeat < 0)
                    this.$player.animate({
                        scrollLeft: xPositionBeat
                    }, 50);                
            }
        },
        _setOption: function (key, value) {
            switch (key) {
                case "numberOfLoopBeats":
                    var prevNumberOfBeats = this.options.numberOfLoopBeats;
                    this.options.numberOfLoopBeats = value;
                    this.adjustNumberOfBeats(prevNumberOfBeats);
                    break;
                default:
                    this.options[ key ] = value;
                    break;
            }
             this._super( "_setOption", key, value );
        },
        _setupTracks: function () {
            //add plus one for the beat track
            for (var i = 0; i < this.options.tracks +1; i++) {
                this._addTrack();
            }
            $(this.element[0]).find('.track:not(:last-child) [class*="span"]').droppable(Mashup.properties.droppableDefaultOptions);
        },
        _trimPlayer: function () {
            var lastBeatWithSample = 0;
            for(var k=0; k<this._samples.length;k++) {
                var sampleStartBeat = this._samples[k].audioSampleGraphical('option','rhythmIndex') / this.options.beatIncrement;
                var sampleLastBeat = sampleStartBeat + this._samples[k].audioSampleGraphical('getNumberOfBeats');
                lastBeatWithSample = sampleLastBeat > lastBeatWithSample ? sampleLastBeat : lastBeatWithSample;
            }            
            if(lastBeatWithSample >= this._viewableBeats) {
                this.options.numberOfLoopBeats = lastBeatWithSample;
                this.adjustNumberOfBeats(lastBeatWithSample);                
            }
        },
        adjustNumberOfBeats: function (prevNumberOfBeats) {
            var numberOfBeats = this.options.numberOfLoopBeats;
            var numWidths = numberOfBeats / this._viewableBeats * 100;
            $('.track').width(numWidths + "%"); 

            //Check if adding or removing measures
            if (numberOfBeats > prevNumberOfBeats) {
                //adding
                var beatsToAdd = numberOfBeats - prevNumberOfBeats;
                //Adjust track array
                this._addBeatsToTracks(beatsToAdd);    
                
                var beat = '<div class="span1"></div>';
                var measure = '<div class="span1 measure"></div>';
                for (var i = 0; i < beatsToAdd; i++) {
//                    if(i % 4) {
                        this.element.children().append(beat);    
                    //}
                    //else {
                    //    this.element.children().append(measure);
                    //    this.element.children().append(beat);
                    //}                    
                    this.element.children(':not(:last-child)').find(':last-child').droppable(Mashup.properties.droppableDefaultOptions);
                }
            }
            else {
                //removing                
                var beatsToRemove = prevNumberOfBeats - numberOfBeats;                
                
                //Trim off beats for each track
                for(var k = 0; k<this.options.tracks;k++) {
                    this._removeBeatsFromTrack(prevNumberOfBeats, beatsToRemove, k);                        
                }
                
                for (var j = 0; j < beatsToRemove; j++) {
                    //remove samples first, then remove measure
                    var lastMeasures = this.element.children().children(':last-child');
                    $.each(lastMeasures, function (ndx, item) {
                        $(item).remove();
                    });
                }                
            }
            this.correctSpanWidths();            
        },
        //This cycles through all the spans and calculates. This is very intensive though
        //TODO: We need to figure out how to make this faster.  
        correctSpanWidths: function () {
            var numberOfBeats = this.options.numberOfLoopBeats;            
            var $tracks = $(this.element[0]).children('.track');
            for (var j = 1; j <= numberOfBeats; j++) {
                //$('.track .span' + j).width(j / numberOfBeats * 100 + "%");
                $tracks.children('.span' + j).width(j / numberOfBeats * 100 + "%");
            }                        
        },       

        loadMix: function (mix) {  
            
            var jsonMix = JSON.parse(mix);
            //Setup player options
            this.options = jsonMix.player;
            
            //Adjust controls outside player
            $('#PlayerBpm').val(jsonMix.player.bpm);
            this.adjustNumberOfBeats(jsonMix.player.numberOfLoopBeats);

            //load samples with this new bpm
            Mashup.GetSamples();

            Mashup.StartLoading();
            //Trick to get loading to work during processing call
            setTimeout(function() {
                //Add samples to player
                $.each(jsonMix.samples, function(ndx, item) {
                    //First Get Div
                    var $track = this.$player.children('.track:eq(' + item.track + ')');
                    // Add spans until you reach start beat
                    var spanAggregate = 0;
                    var currentDiv = $track.children(':first-child');
                    item.startBeat = item.rhythmIndex / jsonMix.player.beatIncrement;
                    while (spanAggregate < item.startBeat) {
                        var spanNumber = currentDiv.attr('class').match(Mashup.properties.numberRegEx);
                        spanAggregate += parseInt(spanNumber[0]);
                        currentDiv = currentDiv.next();
                    }

                    var $playerDiv = currentDiv;
                    //Create sample and add to player
                    Mashup.MoveSampleToPlayer(item, $playerDiv);
                });
                Mashup.EndLoading();
            }, 10);
        },
        play: function () {
            if(this.stopped) {
                this.$player.find('.track:last-child span:nth-child(0)').addClass('onBeat');
            }
            //Graphical usually doesn't have problem with loading...so set to true
            this.isLoaded = true;
            $.Mashup.audioPlayer.prototype.play.call(this);
            this._toggle.text('Pause').append('<i class="icon-pause icon-white"></i>');
            //We need to also disable the player options up top
            $('.player-option').attr('disabled', 'disabled');                
        },
        pause: function () {
            $.Mashup.audioPlayer.prototype.pause.call(this);
            this._toggle.text('Play').append('<i class="icon-play icon-white"></i>');
            $('.player-option').removeAttr('disabled');
        },
        savePlayer: function (self) {
            var samples = [];
            var distinctSampleIds = [];
            for(var i=0;i<this._samples.length;i++) {
                var sample = this._samples[i].audioSampleGraphical("getOptions");    
                samples.push(sample);
                if(distinctSampleIds.indexOf(sample.id) < 0)
                    distinctSampleIds.push(sample.id);
            }
            var player = this.options;
            
            var mix = {
                player: player,
                samples: samples
            };
            var saveBtn = $(self);
            //not logged in.  show user to login screen
            if (saveBtn.attr('data-signed-in') === "false") {
                $.jStorage.set('latestUserMix', JSON.stringify(mix));
                $.jStorage.set('latestSampleIds', distinctSampleIds);
                window.location.href = '/Account/Logon?continue=' + escape('/Home&saveMix=true');
                return false;
            }
            //user signed in. Save if new mash, update if updating
            $('#MashupJson').val(JSON.stringify(mix));
            $('#SampleIds').val(distinctSampleIds);
            if ($('#mashId').val() === '0') {
                //new mashId
                $('#saveModal').modal('show');                
            } else {
                var distinctIds = $('#SampleIds').val().split(",");
                Mashup.StartLoading('Updating Mashup....');
                var postData = {
                    Id: $('#mashId').val(),
                    MashupJson: $('#MashupJson').val(),
                    SampleIds: distinctIds
                };
                var url = '/api/mashups?format=json'; 
                $.ajax({
                    type: 'PUT',
                    data: postData,
                    url: url,
                    traditional: true,
                    success: function () {
                        $('#selectedTags').empty();
                        $('#hiddenTags').empty();
                        Mashup.EndLoading();
                        Mashup.ShowMessage("Success", "Your mash was updated.", Mashup.properties.messageType.Success);
                    },
                    error: Mashup.GenericErrorMessage
                });
            }           
        },
        schedule: function () {
            this._drawNote();
            $.Mashup.audioPlayer.prototype.schedule.call(this);           
        },
        stop: function () {
            $.Mashup.audioPlayer.prototype.stop.call(this);      
            $('.player-option').removeAttr('disabled');
            this._toggle.text('Play').append('<i class="icon-play icon-white"></i>');            
        },
        //does the checking. If it's paused, will play. If playing, will pause
        togglePlay: function() {
            if (this._toggle.children('i').hasClass('icon-pause'))
                this.pause();
            else
                this.play();
        },
        _destroy: function () {
            this._samples = null;
            this._tracks = null;
            this._toggle.unbind('click');           
            this._stop.unbind('click');
            this._clear.unbind('click');
            this._save.unbind('click');
            $('body').unbind('keydown');
        }
    });

})(jQuery, window, document);






