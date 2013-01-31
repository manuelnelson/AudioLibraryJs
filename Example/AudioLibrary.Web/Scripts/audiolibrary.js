;/* File Created: March 30, 2012 */
/*!
* jQuery UI Widget-factory plugin boilerplate (for 1.8/9+)
* Author: @addyosmani
* Further changes: @peolanha
* Licensed under the MIT license
*/

; (function ($, window, document, undefined) {

    // define your widget under a namespace of your choice
    //  with additional parameters e.g.
    // $.widget( "namespace.widgetname", (optional) - an
    // existing widget prototype to inherit from, an object
    // literal to become the widget's prototype ); 

    $.widget("Mashup.audioControl",$.ui.mouse, {

        //Options to be used as defaults 
        options: {
            sample: null, //this option will be changed a lot as different samples are picked            
            sliderThumbId: null
        },            
        //Setup widget (eg. element creation, apply theming
        // , bind events etc.)
        _create: function () {
            this._mouseInit();
            this.options.sliderThumbId = this.element.attr('id');
            //Check whether control is a horizontal control
            this.vertical = !$(this.element).parent().parent().hasClass('horizontal');
            this.track = this.element.siblings('.slider-track');
            if(this.vertical) {
                this.trackMinTop = this.track.position().top;
                this.trackMaxTop = this.track.height() + this.trackMinTop - this.element.height() / 2;
            }
            else {
                this.trackMinLeft = this.track.position().left;
                this.trackMaxLeft = this.track.width() + this.trackMinLeft - this.element.width()/2;                                
            }
        },

        // need to override the mouse functions
	    _mouseStart: function(e){
		    // keep track of where the mouse started
	        if(this.vertical) {
	            this.originalMousePosition = e.pageY;	        
	            this.originalTop = parseInt(this.element.css('top').replace("px",""));	            
	        }else {
	            this.originalMousePosition = e.pageX;	        
	            this.originalLeft = parseInt(this.element.css('left').replace("px",""));	            	            
	        }
	    },
	    _mouseDrag: function(e){
	        var value;
	        if(this.vertical) {
	            var mouseOffset = this.originalMousePosition - e.pageY;
	            var top = this.originalTop - mouseOffset;
	            if(top <= this.trackMinTop)
	                top = this.trackMinTop;
	            else if(top >= this.trackMaxTop)
	                top = this.trackMaxTop;
	        
	            //check if thumb is higher than track
	            this.element.css('top', top);
	            value = 1 - top / (this.trackMaxTop - this.trackMinTop);
	        }else {
	            var mouseOffset = this.originalMousePosition - e.pageX;
	            var left = this.originalLeft - mouseOffset;
	            if(left <= this.trackMinLeft)
	                left = this.trackMinLeft;
	            else if(left >= this.trackMaxLeft)
	                left = this.trackMaxLeft;
	        
	            //check if thumb is higher than track
	            this.element.css('left', left);	            	            
	            value = 1 - left / (this.trackMaxLeft - this.trackMinLeft);
	        }
	        if(this.options.sample !== null) {
	            this.options.sample.audioSampleGraphical('option', this.options.sliderThumbId, value);
	        }	            
	    },
        // Respond to any changes the user makes to the
        // option method
        _setOption: function (key, value) {
            switch (key) {
                case "someValue":
                    //this.options.someValue = doSomethingWith( value );
                    break;
                default:
                    this.options[key] = value;
                    break;
            }

             this._super( "_setOption", key, value );
        },


        sliderSetPosition: function (value) {                                    
            if (this.vertical) {
                var top = (1 - value) * (this.trackMaxTop - this.trackMinTop);
                this.element.css('top', top);
                //This centers the audio-control appropriately since position is absolute. 28 is width of the image
                var adjustedWidth = ($(this.element).parent().width() - 28) / 2;
                $(this.element).css('left', adjustedWidth);
            } else {
                var left = (1 - value) * (this.trackMaxLeft - this.trackMinLeft);
                this.element.css('left', left);	            	                            
            }
        },

        // Destroy an instantiated plugin and clean up
        // modifications the widget has made to the DOM
        _destroy: function () {
        }


    });

})(jQuery, window, document);
;/*!
* jQuery UI Widget factory "bridge" plugin boilerplate
* Author: @erichynds
/*!
* jQuery UI Widget-factory plugin boilerplate (for 1.8/9+)
* Author: @addyosmani
* Further changes: @peolanha
* Licensed under the MIT license
https://github.com/addyosmani/jquery-plugin-patterns/blob/master/jquery.widget-factory.plugin-boilerplate.js
*/

; (function ($, window, document, undefined) {

    // define your widget under a namespace of your choice
    //  with additional parameters e.g.
    // $.widget( "namespace.widgetname", (optional) - an
    // existing widget prototype to inherit from, an object
    // literal to become the widget's prototype ); 
    $.widget("Mashup.audioPlayer", {

        //Options to be used as defaults
        options: {
            bpm: 115,
            numberOfLoopBeats: 16,
            rhythmIndex: 0,
            beatIncrement: 4, //4 = 16th note, 2 = 8th note, 1 = quarter note, etc.
            tracks: 5
        },

        //HACK (sort of)!!! to avoid re-writing methods b/c of difference between graphical player and audioplayer
        isGraphical: false,
        rhythmIndex: 0, 
        isLoaded: false,
        stopped: true,
        //Contains the samples
        _samples: [],
        //To avoid loading the same sample multiple times, we use the loaded samples array to keep track of samples already loaded 
        _loadedSamples: [],
        //a beat representation of the tracks, what's filled, etc
        _tracks: [],
        _effects: [],
        _uniqueSampleIdentifier: 1, //Gives a sample a unique id
        _create: function () {
            if (window.webkitAudioContext) {
                this.context = new webkitAudioContext();
            } else {
                //no webaudio api
                throw 'This application requires a Web Audio API enabled browser.  Please download ' +
                    '<a href="http://www.google.com/chrome" title="chrome" target="_blank">Chrome</a> '
                    + 'to take part in the fun! (Trust me, its quick, painless and well worth it)';
            }
            var finalMixNode;
            if (this.context.createDynamicsCompressor) {
                // Create a dynamics compressor to sweeten the overall mix.
                this.compressor = this.context.createDynamicsCompressor();
                this.compressor.connect(this.context.destination);
                finalMixNode = this.compressor;
            } else {
                // No compressor available in this implementation.
                finalMixNode = this.context.destination;
            }

            // Create master volume.
            this.masterGainNode = this.context.createGainNode();
            this.masterGainNode.gain.value = 0.7; // reduce overall volume to avoid clipping
            this.masterGainNode.connect(finalMixNode);

            // Create effect volume.
            this.effectLevelNode = this.context.createGainNode();
            this.effectLevelNode.gain.value = 1.0; // effect level slider controls this
            this.effectLevelNode.connect(this.masterGainNode);

            //Load effects
            //this._loadEffects();
            //if graphical, this is called in the player graphical constructor
            if (!this.isGraphical) {
                this._setupTracks();
            }
            //contains the jquery instance of the binding element
            this.$player = $(this.element[0]);
        },
         
        //Adds a blank track to the player
        _addTrack: function () {
            var track = [];
            for (var i = 0; i < this.options.numberOfLoopBeats; i++) {
                track.push(0);
            }
            this._tracks.push(track);            
        },

        //Adds empty beats to all tracks of the player 
        _addBeatsToTracks: function (numberOfBeats) {
            var beatsToAdd = [];
            for (var j = 0; j < numberOfBeats; j++) {
                beatsToAdd.push(0);
            }
            for (var i = 0; i < this._tracks.length; i++) {
                this._tracks[i] = this._tracks[i].concat(beatsToAdd);
            }
        },

        _advanceNote: function () {
            // Advance time by a 16th note...
            var secondsPerBeat = 60.0 / this.options.bpm;

            this.rhythmIndex++;

            if (this.rhythmIndex === this.options.numberOfLoopBeats * this.options.beatIncrement) {
                this.rhythmIndex = 0;
                this._currentBeat = 0;
            }

            this.noteTime += (secondsPerBeat / this.options.beatIncrement);
        },

        _checkSamples: function () {
            var that = this;
            var startSamples = $.grep(this._samples, function (n) {
                var startTime = n.sample('getStartTime');
                //alert(n.sample('getEndTime'));
                return (startTime >= that._timerCounter && startTime < (that._timerCounter + that.options.timerInterval) || (that._timerCounter < n.sample('getEndTime') && n.sample('hasSampleStarted')));
            });
            $.each(startSamples, function (ndx, item) {
                item.sample('option', 'sampleStarted', true);
                item.sample('play');
            });
        },

        _loadEffects: function () {
            var numberOfEffects = $('#effectList option').length;
            var self = this;
            //Skip first as it has no effect
            for (var i = 1; i < numberOfEffects; i++) {
                var $option = $('#effectList option').eq(i);
                var effectOptions = {
                    wetMix: $option.attr('data-wet'),
                    dryMix: $option.attr('data-dry'),
                    url: $option.attr('data-url'),
                    effectType: $option.val(),
                    context: self.context
                };
                this._effects.push($option.effects(effectOptions));
            }
        },
        _playNote: function (sample, panEnabled, x, y, z, effectEnabled, effectType, sendGain, mainGain, playbackRate, noteTime, delay, playDuration) {
            // Create the note
            var source = this.context.createBufferSource();            
            source.buffer = this.isGraphical ? sample.audioSampleGraphical('getBuffer') : sample.audioSample('getBuffer');
            source.playbackRate.value = playbackRate;

            //Pass bufferSource back to sample
            this.isGraphical ? sample.audioSampleGraphical('setBufferNode', source) : sample.audioSample('setBufferNode', source);
            

            // Optionally, connect to a panner
            var sourceNode;
            if (panEnabled) {
                //https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html#AudioPannerNode-section
                //It's not perfect yet but it is getting there
                var panner = this.context.createPanner();
                panner.panningModel = webkitAudioPannerNode.HRTF;
                panner.setPosition(x, y, z);
                panner.setOrientation(-x, y, z);
                panner.coneInnerAngle = 1;
                panner.coneOuterGain = 0;
                source.connect(panner);
                sourceNode = panner;
            } else {
                sourceNode = source;
            }

            //get effects information
            if (!effectEnabled) {
                sourceNode.connect(this.masterGainNode);
            }
            else {
                var effect = this.getEffect(effectType);
                var sampleEffectVal = this.isGraphical ? sample.audioSampleGraphical('option', 'effect') : sample.audioSample('option', 'effect');
                var effectDryMix = effect.effects('option', 'dryMix');
                var effectWetMix = effect.effects('option', 'wetMix');
                var convolver = this.isGraphical ? sample.audioSampleGraphical('getConvolver') : sample.audioSample('getConvolver');
                convolver.connect(this.effectLevelNode);


                // Connect to dry mix
                var dryGainNode = this.context.createGainNode();
                dryGainNode.gain.value = mainGain * effectDryMix;
                sourceNode.connect(dryGainNode);
                dryGainNode.connect(this.masterGainNode);

                // Connect to wet mix
                var wetGainNode = this.context.createGainNode();
                wetGainNode.gain.value = effectWetMix * sampleEffectVal;
                sourceNode.connect(wetGainNode);
                wetGainNode.connect(convolver);
            }
            //source.noteOn(noteTime);
            source.noteGrainOn(noteTime, delay, playDuration);
        },
        //Removes numberOfBeatsToRemove from a track in the player
        _removeBeatsFromTrack: function (currentNumberOfBeats, numberOfBeatsToRemove, trackNdx) {
            var startNdx = currentNumberOfBeats - numberOfBeatsToRemove;
            var beatsToRemove = this._tracks[trackNdx].splice(startNdx, numberOfBeatsToRemove);
            this._removeSamplesFromTrack(beatsToRemove);
        },

        //When passed an array of sampleIds, this will remove the samples from the player    
        _removeSamplesFromTrack: function (array) {
            //Get samples from track
            var samples = $.grep(array, function (item) {
                return item != 0;
            });
            while (samples.length > 0) {
                var sampleId = samples[0]; //Values in track array are uniqueId's of the sample                
                this.removeSampleById(sampleId);
                //remove sample from samples array
                samples = $.grep(samples, function (item, ndx) {
                    return item != sampleId;
                });
            }
        },

        //Removes the last track of the player
        _removeTrack: function () {
            this._removeTrackAtIndex(0);
        },

        //Removes a track from the player at index index
        _removeTrackAtIndex: function (index) {
            //Remove samples from track
            this._removeSamplesFromTrack(this._tracks[index]);
            //remove track    
            this._tracks.splice(index, 1);
        },
        
        _setupTracks: function(){                    
            for (var i = 0; i < this.options.tracks; i++) {                
                this._addTrack();
            }
        },
        
        _stopSamples: function () {
            var self = this;
            $.each(this._samples, function (ndx, item) {
                self.isGraphical ? item.audioSampleGraphical('stop', self.noteTime) : item.audioSample('stop', self.noteTime);
            });
        },

        // Respond to any changes the user makes to the
        // option method
        _setOption: function (key, value) {
            switch (key) {
                case "numberOfLoopBeats":
                    this.adjustNumberOfBeats(value);
                    this.options.numberOfLoopBeats = value;
                    break;
                default:
                    this.options[key] = value;
                    break;
            }
             this._super( "_setOption", key, value );
        },
        _waitForSamples: function () {
            this._toggle.text('').append('<i class="icon-refresh icon-white"></i>');
            var self = this;
            var timer = setInterval(function() {               
                try {
                    $.each(self._samples, function(ndx, item) {
                        item.audioSample('getBuffer');
                    });                    
                    Mashup.EndLoading();
                    self.isLoaded = true;
                    self.play();
                    clearInterval(timer);                    
                } catch(ex) {                    
                }
            }, 1000);
        },
        addLoadedSample: function (loadedSample) {
            this._loadedSamples.push(loadedSample);  
        },
        //Assign sample index of players samples.
        addSample: function (sample) {
            var sampleId = this._uniqueSampleIdentifier++;
            this.isGraphical ? sample.audioSampleGraphical('setUniqueIdentifier', sampleId) : sample.audioSample('setUniqueIdentifier', sampleId);
                
            //add sample
            this.addOrRemoveSampleToTrack(sample, sampleId);
            this._samples.push(sample);

        },

        addOrRemoveSampleToTrack: function (sample, value) {
            var trackNdx = this.isGraphical ? sample.audioSampleGraphical('option', 'track') : sample.audioSample('option', 'track');
            var startBeat = this.isGraphical ? sample.audioSampleGraphical('getStartBeat') : sample.audioSample('getStartBeat');
            var length = this.isGraphical ? sample.audioSampleGraphical('getNumberOfBeats') : sample.audioSample('getNumberOfBeats');
            var track = this._tracks[trackNdx];
            for (var j = startBeat; j < length + startBeat; j++) {
                track[j] = value;
            }
        },
        adjustNumberOfBeats: function (numberOfBeats) {
            var currNumberOfBeats = this._tracks[0].length;

            //Check if adding or removing measures
            if (numberOfBeats > currNumberOfBeats) {
                //adding
                var beatsToAdd = numberOfBeats - currNumberOfBeats;
                //Adjust track array
                this._addBeatsToTracks(beatsToAdd);

            }
            else {
                //removing                
                var beatsToRemove = currNumberOfBeats - numberOfBeats;

                //Trim off beats for each track
                for (var k = 0; k < this.options.tracks + 1; k++) {
                    this._removeBeatsFromTrack(currNumberOfBeats, beatsToRemove, k);
                }
            }
        },
        getContext: function () {
            return this.context;
        },
        getEffect: function (effectType) {
            return $.grep(this._effects, function (item) {
                return item.effects('option', 'effectType') == effectType;
            })[0];
        },
        getLoadedSampleById: function (loadedId) {
            return $.grep(this._loadedSamples, function (item) {
                    return item.id === loadedId;
            })[0];              
        },
        getSampleByUniqueId: function (uniqueId) {
            var self = this;
            return $.grep(this._samples, function (item) {
                return self.isGraphical ? item.audioSampleGraphical('getUniqueIdentifier') === uniqueId : item.audioSample('getUniqueIdentifier') === uniqueId;
            })[0];
        },

        getTrackByIndex: function (index) {
            return this._tracks[index];
        },
        loadMix: function (mix) {
            //Setup player options
            var jsonMix = JSON.parse(mix);
            this.options = jsonMix.player;
            this.reset();
            this.isLoaded = false;
            var self = this;
            //Adjust controls outside player
            this.adjustNumberOfBeats(jsonMix.player.numberOfLoopBeats);
            Mashup.StartLoading();
            //Trick to get loading to work during processing call
            setTimeout(function() {
                //Add samples to player
                $.each(jsonMix.samples, function(ndx, item) {
                    //Create sample and add to player
                    var $div = $("<div />").append("&nbsp;");//div needs something otherwise it doesn't appear
                    $('#player').append($div);
                    var sample = $div.audioSample(item);//create sample
                    self.addSample(sample);
                });                                
            }, 10);
            this.play();
        },
        play: function () {
            if(!this.isLoaded) {
                this._waitForSamples();    
            }    
            else {
                if(this.stopped) {
                    this.noteTime = 0.0;
                    this.stopped = false;
                }
                this.startTime = this.context.currentTime - this.noteTime + 0.005;
                this._toggle.text('').append('<i class="icon-pause icon-white"></i>');
                this._isPlaying = true;
                this.schedule();
            }
            //add browser tab play
            $('title').text('▶ ' + $('title').text());
        },
        pause: function () {
            //this.noteTime
            this._stopSamples();
            this._toggle.text('').append('<i class="icon-play icon-white"></i>');
            this._isPlaying = false;
            clearTimeout(this.timeoutId);
            $('title').text($('title').text().replace(/▶/g, ''));            
        },
        removeSampleById: function (sampleId) {
            //Get sample
            var sample = this.getSampleByUniqueId(sampleId);

            //Set sample on track to zero
            this.addOrRemoveSampleToTrack(sample, 0);
            //Get index of sample
            var ndx = this._samples.indexOf(sample);
            this.removeSampleByIndex(ndx);
        },
        removeSampleByIndex: function (index) {
            var sample = this._samples[index];
            this.isGraphical ? sample.audioSampleGraphical('destroy') : sample.audioSample('destroy');
            this._samples.splice(index, 1);
        },
        reset: function () {
            var self = this;
            self.stop();

            //Important:  always remove tracks from last to first to avoid errors
            for(var k=this.options.tracks-1;k>=0;k--){
                self._removeTrackAtIndex(k);
            }; 
            this._tracks = [];
            this._setupTracks();
            //make sure mashId is cleared out
            $('#mashId').val('0');
            $('#playerSave').text('Save');
        },
        schedule: function () {
            var currentTime = this.context.currentTime;

            // The sequence starts at startTime, so normalize currentTime so that it's 0 at the start of the sequence.
            currentTime -= this.startTime;

            while (this.noteTime < currentTime + 0.200) {
                // Convert noteTime to context time.
                var contextPlayTime = this.noteTime + this.startTime;

                for (var k = 0; k < this._samples.length; k++) {
                    var sample = this._samples[k];
                    var startIndex = this.isGraphical ? sample.audioSampleGraphical('option', 'rhythmIndex') : sample.audioSample('option', 'rhythmIndex');
                    if (this.rhythmIndex === parseInt(startIndex)) {
                        var sampleOptions = this.isGraphical ? sample.audioSampleGraphical('getOptions') : sample.audioSample('getOptions');
                        var playbackRate = sampleOptions.bpm === 0 ? 1 : this.options.bpm / sampleOptions.bpm;
                        var pan = -5 + 10 * sampleOptions.pan;
                        var panEnabled = pan != 0; //No need to pan if err thang is in the middle
                        var effectNdx = sampleOptions.effectType;
                        var effectEnabled = effectNdx !== -1;
                        var delay = sampleOptions.trimStart;
                        var playDuration = sampleOptions.playDuration - .01; //Subtract the tiniest of bits b/c if playduration exceeds actual sample duration, nothing gets played.
                        var shift = sampleOptions.shiftSample;
                        this._playNote(sample, panEnabled, pan, 0, 0, effectEnabled, effectNdx, 0, 1, playbackRate, contextPlayTime + shift, delay, playDuration);
                    }
                }

                this._advanceNote();
            }

            this.timeoutId = this.isGraphical ? setTimeout("Mashup.Player.audioPlayerGraphical('schedule')",0) : setTimeout("Mashup.Player.audioPlayer('schedule')", 0);

        },
        setToggle: function (toggle) {
            this._toggle = $(toggle);    
        },
        stop: function () {
            this.stopped = true;
            this._isPlaying = false;
            this._stopSamples();
            this._toggle.text('').append('<i class="icon-play icon-white"></i>');
            clearTimeout(this.timeoutId);
            this.rhythmIndex = 0;
            this._currentBeat = 0;
            $('title').text($('title').text().replace(/▶/g, ''));
        },
        updateLoadedSample: function (loadedSample) {
            var sample = $.grep(this._loadedSamples, function (item) {
                return item.id === loadedSample.id;
            })[0];

            sample.buffer = loadedSample.buffer;
            //now update all samples buffers that are the same
            if (this.isGraphical) {
                for (var j = 0; j < this._samples.length; j++) {
                    if (this._samples[j].audioSampleGraphical('option', 'id') === loadedSample.id) {
                        this._samples[j].audioSampleGraphical('setBuffer', loadedSample.buffer);
                    }
                }
            } else {
                for (var j = 0; j < this._samples.length; j++) {
                    if (this._samples[j].audioSample('option', 'id') === loadedSample.id) {
                        this._samples[j].audioSample('setBuffer', loadedSample.buffer);
                    }
                }
            }

        },
        // Destroy an instantiated plugin and clean up
        // modifications the widget has made to the DOM
        _destroy: function () {
            this.reset();
            this._samples = null;
            this._tracks = null;
            this._loadedSamples = null;
            this._toggle.unbind('click');
        }
    });

})(jQuery, window, document);







;; (function ($, window, document, undefined) {

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







;; (function ($, window, document, undefined) {
    $.widget("Mashup.audioSample", {

        //Options to be used as defaults
        options: {
            loop: false,
            fileName: null,
            sampleName: null,
            artist: null,
            bpm: 88,
            id: 0,
            rhythmIndex: 0,
            track: 0,
            mono: false,
            duration: 0,
            volume: 0.4096,
            pan: 0.5,
            effectType: -1,
            effect: 0.5,
            trimStart: 0,
            shiftSample: 0,
            playDuration: 0            
        },
        isGraphical: false,
        _trimEnd: 0,
        sampleUniqueId: 0,

        _create: function () {
            this._calculateStartBeat();
            this._calculateNumberOfBeats();
            this._loadSample();

            //create convolver
            this.convolver = this.isGraphical ? Mashup.Player.audioPlayerGraphical('getContext').createConvolver() :Mashup.Player.audioPlayer('getContext').createConvolver();
        },

        _calculateStartBeat: function () {
            var beatIncrement = this.isGraphical ? Mashup.Player.audioPlayerGraphical('option', 'beatIncrement') :Mashup.Player.audioPlayer('option', 'beatIncrement');
            this.startBeat = Math.round(this.options.rhythmIndex / beatIncrement);
        },

        _calculateNumberOfBeats: function () {
            this.numberOfBeats = Math.round((this.options.bpm / 60) * this.options.playDuration);
            //Some sound effect samples can be short and make numberOfBeats = 0.  At a minimum this should be 1 so it displays appropriately.
            if (this.numberOfBeats === 0)
                this.numberOfBeats = 1;
        },
        //typically this is passed in.  But if an edit is made to the number of beats, we need to calulate the new tempo
        _calculateTempo: function () {
            this.options.bpm = (this.numberOfBeats / this.options.duration) * 60;
        },
        _loadSample: function () {
            //first, check if samples has been loaded before
            var loadedSample = this.isGraphical ? Mashup.Player.audioPlayerGraphical('getLoadedSampleById', this.options.id) : Mashup.Player.audioPlayer('getLoadedSampleById', this.options.id); 
            if (typeof loadedSample.buffer != 'undefined') {
                //samples been loaded before.  Just assign and return;
                this.buffer = loadedSample.buffer;
                return;
            }
            if (typeof loadedSample.id != 'undefined') {
                //samples is loading but not complete - This can happen if we are loading an entire mix. 
                //Let's not load again. We'll assign this sample later (updateLoadedSample)
                return;
            }
            //If we got here, this is a completely new sample.
            var newSample = {
                id: this.options.id
            };
            this.isGraphical ? Mashup.Player.audioPlayerGraphical('addLoadedSample', newSample) : Mashup.Player.audioPlayer('addLoadedSample', newSample);
            var url;
            var self = this;
            if (!this.options.fileName) {
                //No filename. This sample is coming from an audioViewer. The buffer will be added manually. 
                url = $(this.options.waveFormElement).audioViewer('getFinalSampleBuffer');
                //this.buffer = Mashup.Player.audioPlayerGraphical('getContext').createBuffer($(this.options.waveFormElement).audioViewer('getFinalSampleBuffer'), this.options.mono);
                return;
            } else {
                url = Mashup.properties.sampleFilePath + this.options.fileName;
            }
            // Load asynchronously
            var request = new XMLHttpRequest();
            request.open("GET", url, true);
            request.responseType = "arraybuffer";
            request.onload = function () {
                self.buffer = self.isGraphical ? Mashup.Player.audioPlayerGraphical('getContext').createBuffer(request.response, self.options.mono) : Mashup.Player.audioPlayer('getContext').createBuffer(request.response, self.options.mono);

                self.buffer.gain = self.options.volume;
                newSample = {
                    id: self.options.id,
                    buffer: self.buffer
                };
                self.isGraphical ? Mashup.Player.audioPlayerGraphical('updateLoadedSample', newSample) : Mashup.Player.audioPlayer('updateLoadedSample', newSample);
            };
            request.send();
        },

        // Respond to any changes the user makes to the
        // option method
        _setOption: function (key, value) {
            switch (key) {
                case "volume":       
                    //http://www.dr-lex.be/info-stuff/volumecontrols.html#table1 -- doing the recommended x^4 
                    value = Math.pow(value, 4);
                    this.options.volume = value;
                    if (this.buffer !== null)
                        this.buffer.gain = value;
                    break;
                default:
                    this.options[key] = value;
                    break;
            }

             this._super( "_setOption", key, value );
        },

        getBuffer: function () {
            return this.buffer;
        },
        getConvolver: function () {
            return this.convolver;
        },
        getNumberOfBeats: function () {
            return this.numberOfBeats;
        },
        getStartBeat: function () {
            return this.startBeat;  
        },
        getOptions: function () {
            return this.options;
        },
        getUniqueIdentifier: function () {
            return this.sampleUniqueId;
        },
        setBuffer: function (buffer) {
            this.buffer = buffer;
            this.buffer.gain = this.options.volume;
        },
        setBufferNode: function (bufferNode) {
            this.bufferNode = bufferNode;
        },
        setUniqueIdentifier: function (id) {
            this.sampleUniqueId = id;
        },

        stop: function (noteTime) {
            if (this.bufferNode != null)
                this.bufferNode.noteOff(noteTime);
        },

        _destroy: function () {
        }

    });

})(jQuery, window, document);







;/* File Created: March 19, 2012 */
/*!
* jQuery UI Widget factory "bridge" plugin boilerplate
* Author: @erichynds
/*!
* jQuery UI Widget-factory plugin boilerplate (for 1.8/9+)
* Author: @addyosmani
* Further changes: @peolanha
* Licensed under the MIT license
https://github.com/addyosmani/jquery-plugin-patterns/blob/master/jquery.widget-factory.plugin-boilerplate.js
*/

; (function ($, window, document, undefined) {

    // define your widget under a namespace of your choice
    //  with additional parameters e.g.
    // $.widget( "namespace.widgetname", (optional) - an
    // existing widget prototype to inherit from, an object
    // literal to become the widget's prototype ); 

    $.widget("Mashup.audioSampleGraphical",$.Mashup.audioSample, {

        //Options to be used as defaults
        options: {            
            fileName: null,
            sampleName: null,
            artist: null,
            bpm: 88,
            id: 0,
            rhythmIndex: 0,
            track: 0,
            mono: false,
            duration: 0, //total duration of track
            volume: 0.4096,
            pan: 0.5,
            effectType: -1,
            effect: 0.5,
            trimStart: 0,
            shiftSample: 0,
            playDuration: 0 //duration of track that will be played. This can differ from duration if track is trimmed from start and/or end
        },

        _initiated: false,
        $sampleContainer: null,
        //Setup widget (eg. element creation, apply theming
        // , bind events etc.)
        _create: function () {
            this.isGraphical = true;
            this._calculateStartBeat();
            this._calculateNumberOfBeats();
            this._animate();
            $.Mashup.audioSample.prototype._create.call(this);
            this._handleEvents();            
            this._loadEffect();
            this._initiated = true;
        },

        _animate: function () {
            //If we are unable to make room, we need to forget everything and return
            this._makeTrackRoom();
            
            //New HTML
            this.$sampleContainer = $("<div />").append("<span id='" + this.options.id + "'>" + this.options.sampleName + "</span><a class='icon-remove icon-white pull-right'></a>")
                                         .addClass('sample').attr("data-sample-options", JSON.stringify(this.options));
            this.$sampleContainer.draggable(Mashup.properties.draggableDefaultOptions);
            var that = this.$sampleContainer;

            //append to div
            this.element.append(this.$sampleContainer).fadeIn(function () {
                that.animate({ width: '100%', height: '30px' });
            });
        },
        _loadEffect: function () {
            //Load effect
            if(this.options.effectType === -1)
                return;
            var effect = Mashup.Player.audioPlayerGraphical('getEffect', this.options.effectType);
            this.convolver.buffer = effect.effects('getBuffer');
        },
        _handleEvents: function () {           
            //Hook up close event    
            this.$sampleContainer.find('.icon-remove').click(function () {
                Mashup.Player.audioPlayerGraphical('removeSampleById', self.sampleUniqueId);
            });

            //When playerDiv is clicked...give ability to edit
            var self = this;
            this.$sampleContainer.click(function () {
                self.showControls();
            });
        },
        //Calculate number of beats.  Remove that many beats from track and replace element with new adjusted span            
        _makeTrackRoom: function () {
            var numberOfTrackBeats = Mashup.Player.audioPlayerGraphical('option', 'numberOfLoopBeats');
            //Check if sample extends track.  If so, extend track automatically
            if ((this.startBeat + this.numberOfBeats) >= numberOfTrackBeats) {
                //We add plus one to automatically extend measures if the sample dropped hits the edge
                var measures = Math.ceil((this.startBeat + this.numberOfBeats + 1) / 4);
                numberOfTrackBeats = measures * 4;
                Mashup.Player.audioPlayerGraphical('option', 'numberOfLoopBeats', numberOfTrackBeats);
            }
            //Check if there are any samples on the same track that would overlap
            var track = Mashup.Player.audioPlayerGraphical('getTrackByIndex', this.options.track);
            for (var j = this.startBeat; j < this.startBeat + this.numberOfBeats; j++) {
                if (track[j] !== 0) {
                    throw 'The sample overlaps another sample on the same track.'
                }
            }
            
            //remove the necessary beats ahead and replace with on long numberofBeats span
            for (var i = 0; i < this.numberOfBeats - 1; i++) {
                this.element.next().remove();
            }
            this.element.removeClass('span1');
            this.element.addClass('span' + this.numberOfBeats);
            //manually calculate new span width
            var widthPercentage = this.numberOfBeats / numberOfTrackBeats * 100;
            $('.track .span' + this.numberOfBeats).width(widthPercentage + "%");
            return true;
        },
        //When sample is removed, this sets up the player back appropriately
        _restoreTrackRoom: function () {
            this.element.removeClass('span' + this.numberOfBeats);
            var widthPercentage = 100.0 / Mashup.Player.audioPlayerGraphical('option', 'numberOfLoopBeats');
            this.element.addClass('span1').droppable(Mashup.properties.droppableDefaultOptions).css('width',widthPercentage + '%');
            var beat = "<div class='span1' style='width:" + widthPercentage + "%'></div>";
            console.log(beat);
            //var measure = "<div class='span1 measure' style='width:" +  widthPercentage + "%'></div>";
            var currentBeat = this.startBeat;
            var lastElementAdded = this.element; 
            var newElement;
            for (var i = 0; i < this.numberOfBeats - 1; i++) { 
                //use bottom track to figure measures out
                //if($('.player .track:last-child .span1').eq(i+currentBeat+1).hasClass('measure')) {
                //    newElement = measure;
                //} else { 
                    newElement = beat;
                //}
                lastElementAdded.after(newElement);
                lastElementAdded = lastElementAdded.next();
            }
            this.element.parent().children('.span1').droppable(Mashup.properties.droppableDefaultOptions);
        },
        //Dragging and dropping relies on updated options of each sample. This updates the options on the webpage for dragging and dropping to happen.
        _updateOptionsOnPlayer: function() {
            var options = JSON.stringify(this.options);
            this.$sampleContainer.attr('data-sample-options', options);
        },
        // Respond to any changes the user makes to the
        // option method
        _setOption: function (key, value) {
            switch (key) {
                case "volume":
                    //http://www.dr-lex.be/info-stuff/volumecontrols.html#table1 -- doing the recommended x^4 
                    value = Math.pow(value, 4);
                    this.options.volume = value;
                    if (this.buffer !== null)
                        this.buffer.gain = value;
                    this._updateOptionsOnPlayer();
                    break;
                default:
                    this.options[key] = value;
                    this._updateOptionsOnPlayer();
                    break;
            }

            // For UI 1.9 the _super method can be used instead
             this._super( "_setOption", key, value );
        },

        getInitiated: function () {
            return this._initiated;  
        },
        hideControls: function () {
            $('#sampleSugar').slideUp(500); // Hide - slide up.
            Mashup.Player.find('.sample').removeClass('edit');
            //$('.sample').removeClass('edit');
        },
        play: function (event) {
            this.$sampleContainer.addClass('playing');
        },
        showControls: function () {
            if(this.$sampleContainer.hasClass('edit')) { 
                this.hideControls();
                return; 
            }
            var sampleSugar = $('#sampleSugar');
            Mashup.Player.find('.sample').removeClass('edit');
            this.$sampleContainer.addClass('edit');

            if (!sampleSugar.is(":visible"))
                sampleSugar.slideDown(500); // Show - slide down.
            
            //Get purchase link
            $('#purchaseSong').hide();
            $.ajax({
                url: '/api/samples/' + this.options.id + '?format=json',
                success: function(data) {                    
                    if (data.Sample.BuyLink) {
                        $('#purchaseSong').attr('href', data.Sample.BuyLink);
                        $('#purchaseSong').show();
                    }                        
                },
                error: Mashup.GenericErrorMessage
            });

            //Update panel
            //Show sample information
            $('#sampleArtist').text(this.options.artist);
            $('#sampleName').text(this.options.sampleName);
            $('#sampleBpm').text(this.options.bpm);
            $('#sampleBeats').text(this.numberOfBeats + ' beats');

            //update controls for this sample
            var controls = sampleSugar.find('.slider-thumb');
            var self = this;
            $.each(controls, function (ndx, item) {
                var controlType = $(item).audioControl('option', 'sliderThumbId');
                if(controlType === 'volume') {
                    $(item).audioControl('sliderSetPosition', Math.pow(self.options[controlType],.25));
                }
                else {
                    $(item).audioControl('sliderSetPosition', self.options[controlType]);
                }                
            });

            //Add sample to control
            $('.slider-thumb').audioControl('option', 'sample', self.element);

            //remove previous handlers
            $('#effectList').unbind('change');
            $('#shiftSample').unbind('change');
            
            //Wire Events
            //Set event dropdown and wire up change event
            $('#effectList').val(self.options.effectType);
            //add handler for this sample
            $('#effectList').change(function () {
                self.options.effectType = parseInt($(this).val());
                self._updateOptionsOnPlayer();
                self._loadEffect();
            });
            var playerBps = Mashup.Player.audioPlayerGraphical('option', 'bpm') / 60;
            $('#shiftSample').val(Math.round(self.options.shiftSample * playerBps * 16));
            $('#shiftSample').change(function () {
                //convert beat to seconds
                self.options.shiftSample = $(this).val() / (playerBps * 16); //16 is the denominator of the shift
                self._updateOptionsOnPlayer();
            });

 

            //reset form
            if ($('#sampleLengthEdit').length > 0) {
                $('#sampleLengthEdit').remove();
                $('#sampleEdit i').removeClass('icon-file');
                $('#sampleEdit i').addClass('icon-edit');
            }
        },

        // Destroy an instantiated plugin and clean up
        // modifications the widget has made to the DOM
        _destroy: function () {
            if (this._initiated) {
                this.$sampleContainer.draggable('destroy');
                this.$sampleContainer.remove();
                this._restoreTrackRoom();
            } else {
                this.element.droppable(Mashup.properties.droppableDefaultOptions);
            }
        }

    });

})(jQuery, window, document);







;; (function ($, window, document, undefined) {
    //Contains the audio player used by the audio viewer
    $.widget("Mashup.audioPlayerWaveformViewer",  $.Mashup.audioPlayer,{

        //Options to be used as defaults
        options: {
            waveformStart: 0,
            waveformEnd:0
        },
        
        _advanceLoop: function () {
            // Advance time by a 16th note...
            this.noteTime += this.duration;
        },
        _create: function () {
            this.isGraphical = false;            
            //call base class create
            $.Mashup.audioPlayer.prototype._create.call(this);
        },

        _playNote: function ( noteTime, delay, playDuration) {
            // Create the note
            this.source = this.context.createBufferSource();
            this.buffer.gain = 0.4096;
            this.source.buffer = this.buffer;            
            
            var sourceNode = this.source;            
            sourceNode.connect(this.masterGainNode);            
            this.source.noteGrainOn(noteTime, delay, playDuration);
        },

        _setOption: function (key, value) {
            switch (key) {
                default:
                    this.options[key] = value;
                    break;
            }
             this._super( "_setOption", key, value );
        },

        addSample: function(buffer) {
            this.buffer = buffer;            
        },
        play: function () {
            //Graphical usually doesn't have problem with loading...so set to true
            this.isLoaded = true;
            this.noteTime = 0.0;
            this.startTime = this.context.currentTime - this.noteTime + 0.005;
            this.duration = this.options.waveformEnd - this.options.waveformStart;
            this.schedule();
        },
        schedule: function () {
            var currentTime = this.context.currentTime;

            // The sequence starts at startTime, so normalize currentTime so that it's 0 at the start of the sequence.
            currentTime -= this.startTime;
            if (currentTime < this.noteTime + this.duration && currentTime > this.noteTime) {
                // Convert noteTime to context time.
                var contextPlayTime = this.noteTime + this.startTime;
                
                var delay = this.options.waveformStart;                
                this._playNote(contextPlayTime, delay, this.duration - .01);

                this._advanceLoop();
            }

            this.timeoutId = setTimeout("$('#" + $(this.element[0]).attr('id') + "').audioPlayerWaveformViewer('schedule')", 0);

        },
        stop: function () {
            this.source.noteOff(0);
            clearTimeout(this.timeoutId);
        },
        _destroy: function () {
        }
    });

})(jQuery, window, document);







;; (function ($, window, document, undefined) {
    //Contains the audio player used by the audio viewer
    $.widget("Mashup.audioViewer", {

        //Options to be used as defaults
        options: {
            width: null,
            height: null,
            sampleRate: 48000,
            playButton: null,
            zoomInButton: null,
            zoomOutButton: null,
            dropFileBox: null,
            audioPlayer: null
        },

        _create: function () {
            var self = this;
            //if not initialized, take element width and height
            this.options.width = this.options.width ? this.options.width : $(this.element[0]).width();
            this.options.height = this.options.height ? this.options.height : $(this.element[0]).height();

            var $audioPlayerDiv = $(this.options.audioPlayer);            
            this.$audioPlayer = $audioPlayerDiv.audioPlayerWaveformViewer();

            //Only add spacebar functionality if it's not already taken by the main player
            //if (!$('.player').length > 0) {
            if (Mashup.Player) {
                $('body').keydown(function (e) {
                    if (e.which === 32) {
                        if (e.target.tagName.toUpperCase() === 'INPUT') return;
                        e.preventDefault();
                        self.togglePlay();
                    }
                });
            }

            //the viewer is going to have it's own web player - 
            this.$playBtn = $(this.options.playButton);
            this.$playBtn.click(function () {
                self.togglePlay();
            });

            this.$zoomInBtn = $(this.options.zoomInButton);
            this.$zoomInBtn.click(function () {
                if (!self._isSelected()) {
                    self.processWave.zoomIn();
                }
                else {
                    //Zoom in on selected area
                    self.endWaveform = self._getSelectedWaveformEnd();
                    self.startWaveform = self._getSelectedWaveformStart();
                    self.processWave.zoomInSelected(self.startWaveform, self.endWaveform);
                }
                self._setWaveformData();
                self.processTrim.clear();
            });

            this.$zoomOutBtn = $(this.options.zoomOutButton);
            this.$zoomOutBtn.click(function () { 
                var isSelected = self._isSelected();
                self._setViewerData(isSelected);
                self.processWave.zoomOut();
                self._setWaveformData();
                //if selected, put the Trim back on
                if (isSelected) {
                    var xMin = Math.floor((self.playWaveformStart - self.startWaveform) / (self.endWaveform - self.startWaveform) * self.options.width);
                    var xMax = Math.floor((self.playWaveformEnd - self.startWaveform) / (self.endWaveform - self.startWaveform) * self.options.width);
                    self.processTrim.setTrim(xMin, xMax);
                }
            });

            // Setup the drag and drop listeners.
            if (this.options.dropFileBox) {
                //Drop event only works with addEventListener.  Not sure why it doesn't play nice with jquery's bind as the other events work fine with it.
                var noHash = this.options.dropFileBox.replace('#', '');
                this._dropBox = document.getElementById(noHash);
                this._dropBox.addEventListener("drop", function (e) {
                    self.drop(e);
                }, false);
                this._dropBox.addEventListener("dragover", function (e) {
                    self.dragEnter(e);
                }, false);
                this._dropBox.addEventListener("dragleave", function (e) {
                    self.dragLeave(e);
                }, false);
            }
            //processing is not always ready on page load...setInterval to detect when loaded, then set size dynamically
            var tId = setInterval(function () {
                self.processTrim = Processing.getInstanceById('sampleTrim');
                self.processWave = Processing.getInstanceById('sampleWaveform');
                self.processPlay = Processing.getInstanceById('samplePlayIndex');
                if (self.processTrim && self.processWave && self.processPlay) {
                    clearInterval(tId);
                    self.processWave.setSize(self.options.width, self.options.height);
                    self.processTrim.setSize(self.options.width, self.options.height);
                    self.processPlay.setSize(self.options.width, self.options.height);
                }
            }, 500);
        },
        _isSelected: function () {
            return this.processTrim.isSelected();
        },
        _getSelectedWaveformStart: function () {
            return Math.floor(this.totalWaveformLength * (this.processTrim.getMin() / this.options.width) * this.waveformFraction) + this.startWaveform;
        },
        _getSelectedWaveformEnd: function () {
            return Math.floor(this.totalWaveformLength * (this.processTrim.getMax() / this.options.width) * this.waveformFraction) + this.startWaveform;
        },
        _setWaveformData: function () {
            this.startWaveform = this.processWave.getWaveformStart();
            this.endWaveform = this.processWave.getWaveformEnd();
            this.waveformFraction = (this.endWaveform - this.startWaveform) / this.totalWaveformLength;
        },
        _setViewerData: function (waveformSelected) {
            this.viewerWaveformLength = this.endWaveform - this.startWaveform;
            this.playWaveformStart = this.startWaveform;
            this.playWaveformLength = this.viewerWaveformLength;
            this.playWaveformEnd = this.startWaveform + this.viewerWaveformLength;
            if (waveformSelected) {
                this.playWaveformEnd = this._getSelectedWaveformEnd();
                this.playWaveformStart = this._getSelectedWaveformStart();
                this.playWaveformLength = this.playWaveformEnd - this.playWaveformStart;
            }
        },
        // Respond to any changes the user makes to the
        // option method
        _setOption: function (key, value) {
            switch (key) {
                default:
                    this.options[key] = value;
                    break;
            }

            this._super("_setOption", key, value);
        },
        _setupPlayerandPlotWaveform: function (data) {
            var channelData;
            if (typeof (data) == 'undefined')
                channelData = this.buffer.getChannelData(0);
            else {
                channelData = data;
            }
            this.startWaveform = 0;
            this.endWaveform = channelData.length;

            this.$audioPlayer.audioPlayerWaveformViewer('addSample', this.buffer);
            this.$audioPlayer.audioPlayerWaveformViewer('option', 'waveformStart', this.startWaveform);
            this.$audioPlayer.audioPlayerWaveformViewer('option', 'waveformEnd', this.duration);

            this.totalWaveformLength = channelData.length;
            this.waveformFraction = 1;
            this.processWave.addSample(channelData, this.endWaveform);
            this.processTrim.clear();
        },
        calculateBpm: function (numberOfBeats) {
            var sampleDuration = this.getEndTime() - this.getStartTime();
            return numberOfBeats / sampleDuration * 60;
        },
        //clears the waveform from the viewer
        clear: function () {
            this.processWave.clear();
        },
        //drag and drop file
        drop: function (e) {
            e.stopPropagation();
            e.preventDefault();
            Mashup.StartLoading("Loading and drawing song....");
            $(e.target).removeClass('over');
            var files = e.dataTransfer.files;
            var self = this;
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
                        //remove drop label
                        if ($('#dropInfo').length > 0) {
                            $('#dropInfo').remove();
                        }
                        if ($('#audioViewerControls').length > 0) {
                            $('#audioViewerControls').show(); 
                        }
                        //Show drag icon
                        Mashup.EndLoading();
                        self.loadSampleFromArrayBuffer(this.result);
                    };
                    reader.readAsArrayBuffer(file);
                } else {
                    Mashup.ShowMessage("D'oh!", 'This application requires a File API enabled browser.  Please download ' +
                    '<a href="http://www.google.com/chrome" title="chrome" target="_blank">Chrome</a> '
                            + 'to take part in the fun! (Trust me, its quick, painless and well worth it)');
                    Mashup.EndLoading();
                }
            }
        },
        dragEnter: function (e) {
            e.stopPropagation();
            e.preventDefault();
            //clear previous files if any
            if (e.dataTransfer.files.length > 0)
                e.dataTransfer.dropEffect = 'drop'; // Explicitly show this is a copy.
            $(e.target).addClass('over');
            return false;
        },
        dragLeave: function (e) {
            e.stopPropagation();
            e.preventDefault();
            $(e.target).removeClass('over');
            return false;
        },
        getStartTime: function (forceIsSelected) {
            if (this._isSelected() || forceIsSelected) {
                //current start time of audio as shown in the viewer.
                var currViewerStartTime = this.startWaveform / this.totalWaveformLength * this.duration;
                return (this.processTrim.getMin() / this.options.width) * this.duration * this.waveformFraction + currViewerStartTime;
            }
            return this.startWaveform / this.totalWaveformLength * this.duration;
        },
        getEndTime: function (forceIsSelected) {
            if (this._isSelected() || forceIsSelected) {
                //current start time of audio as shown in the viewer.
                var currViewerStartTime = this.startWaveform / this.totalWaveformLength * this.duration;
                return (this.processTrim.getMax() / this.options.width) * this.duration * this.waveformFraction + currViewerStartTime;
            }
            return this.endWaveform / this.totalWaveformLength * this.duration;

        },
        getSampleBuffer: function () {
            return this.buffer.getChannelData(0);
        },
        getFinalSampleBuffer: function () {
            if (this.buffer === null) {
                throw "You must load a song by dropping song on player";
            }

            this._setViewerData(this._isSelected());

            var startByte = this.playWaveformStart * 4;
            var endByte = this.playWaveformEnd * 4;

            //http://stackoverflow.com/questions/6170421/blobbuilder-ruins-binary-data
            var byteLength = endByte - startByte;
            //Check if time limit on is greater than maxiumum length allowed - (samplerate is 48KHz...)
            if (byteLength > Mashup.properties.maxSampleLength) {
                throw "Sample is too long.  Please keep sample under 90 seconds";
            }
       
            var equalizedArray = this.normalizeSample();
            //Encode the samples to a wave file to be used for web audio api
            var buffer = PCMData.encode({
                data: equalizedArray,
                sampleRate: 44100,
                channelCount: 2,
                bytesPerSample: 2
            });
            var audio = document.createElement('audio');
            var bb = new Blob([buffer], {type: 'audio/wav:base64'});
            var url = window.URL.createObjectURL(bb);
            audio.src = url;
            audio.play();
            return url;
            //var blob = new Blob([equalizedArray], { type: 'text/plain' });
            //return blob;
        },
        isPlaying: function () {
            return !this.$playBtn.children('i').hasClass('icon-play');
        },
        loadSampleFromArrayBuffer: function (arrayBuffer) {
            this.buffer = this.$audioPlayer.audioPlayerWaveformViewer('getContext').createBuffer(arrayBuffer, false);
            this.duration = this.buffer.duration;
            this._setupPlayerandPlotWaveform();
        },
        loadSampleFromFileUrl: function (fileName, id, duration) {
            this.id = id;
            this.duration = duration;

            //first, check if samples has been loaded before
            var loadedSample = Mashup.Player.audioPlayerGraphical('getLoadedSampleById', this.id);
            if (typeof loadedSample.buffer != 'undefined') {
                this.buffer = loadedSample.buffer;
                this._setupPlayerandPlotWaveform();
                return;
            }

            var self = this;
            // Load asynchronously
            var url = Mashup.properties.sampleFilePath + fileName;
            var request = new XMLHttpRequest();
            request.open("GET", url, true);
            request.responseType = "arraybuffer";
            request.onload = function () {
                self.loadSampleFromArrayBuffer(request.response);
            };
            request.send();
        },
        //equalize the signal so max signal is 70%
        normalizeSample: function () {
            var float32Array = new Float32Array(this.buffer.getChannelData(0).buffer),
                resolutionScale = 2500,
                maxVal = 0,//this is a somewhat random number.  Has good performance and decent waveform visualization. Increase for better resolution (and worse performance), decrease for worse resolution 
                resolution = Math.floor((this.playWaveformEnd - this.playWaveformStart) / resolutionScale);

            //get max value
            for (var j = this.playWaveformStart; j < this.playWaveformEnd; j = j + resolution) {
                if (float32Array[j] > maxVal)
                    maxVal = float32Array[j];
            }
            var multiplier = 0.7 / maxVal;
            var equalizedBuffer = new Float32Array(this.playWaveformEnd - this.playWaveformStart);
            //multiply signal by multiplier
            for (var k = this.playWaveformStart; k < this.playWaveformEnd; k++) {
                equalizedBuffer[k - this.playWaveformStart] = float32Array[k] * multiplier;
            }
            //return new signal
            return equalizedBuffer;
        },
        movePlayIndicator: function () {
            //even though nothing is selected, we want the player to act that way
            var startTime = this.getStartTime(true);
            var endTime = this.getEndTime(true);
            this.$audioPlayer.audioPlayerWaveformViewer('option', 'waveformStart', startTime);
            this.$audioPlayer.audioPlayerWaveformViewer('option', 'waveformEnd', endTime);

            this._setViewerData(true);
            this.processPlay.setupPlay(this.viewerWaveformLength, this.playWaveformStart - this.startWaveform, this.playWaveformLength, this.options.sampleRate);
        },
        play: function () {
            //TODO: this play button either needs a requirement to use .icon-play/.icon-stop or we need another way around this
            this.$playBtn.children('i').removeClass('icon-play').addClass('icon-stop');
            this.movePlayIndicator();
            this.processPlay.play();
            this.$audioPlayer.audioPlayerWaveformViewer('play');
            this.$zoomInBtn.attr('disabled', 'disabled');
            this.$zoomOutBtn.attr('disabled', 'disabled');
            $('title').text('▶ ' + $('title').text());
        },
        stop: function () {
            this.$playBtn.children('i').removeClass('icon-stop').addClass('icon-play');
            this.processPlay.stop();
            this.$audioPlayer.audioPlayerWaveformViewer('stop');
            this.$zoomInBtn.removeAttr('disabled');
            this.$zoomOutBtn.removeAttr('disabled');
            $('title').text($('title').text().replace(/▶/g, ''));
        },
        togglePlay: function () {
            if (this.isPlaying()) {
                this.stop();
            } else {
                this.play();
            }
        },
        _destroy: function () {
            this.$playBtn.unbind('click');
            this.$zoomInBtn.unbind('click');
            this.$zoomOutBtn.unbind('click');
            this._dropBox.removeEventListener("drop");
            this._dropBox.removeEventListener("dragover");
            this._dropBox.removeEventListener("dragleave");
        }

    });

})(jQuery, window, document);







;/* File Created: April 3, 2012 */
//an impulse response is used for the effects
/*!
* jQuery UI Widget-factory plugin boilerplate (for 1.8/9+)
* Author: @addyosmani
* Further changes: @peolanha
* Licensed under the MIT license
*/

; (function ($, window, document, undefined) {

    // define your widget under a namespace of your choice
    //  with additional parameters e.g.
    // $.widget( "namespace.widgetname", (optional) - an
    // existing widget prototype to inherit from, an object
    // literal to become the widget's prototype ); 

    $.widget("Mashup.effects", {

        //Options to be used as defaults
        options: {
            //Required
            url:  '',
            context: null,            
            
            //Optional
            startedLoading: false,
            isLoaded:  false,    
            wetMix: 0,
            dryMix: 0
        },
        buffer: null,

        _create: function () {
            if (this.options.startedLoading) {
                return;
            }
    
            this.options.startedLoading = true;
            this.load();
        },

        _setOption: function (key, value) {
            switch (key) {
                case "someValue":
                    //this.options.someValue = doSomethingWith( value );
                    break;
                default:
                    //this.options[ key ] = value;
                    break;
            }

             this._super( "_setOption", key, value );
        },
        getBuffer: function() {
            return this.buffer;  
        },
        load: function () {
            // Load asynchronously
            var request = new XMLHttpRequest();
            request.open("GET", this.options.url, true);
            request.responseType = "arraybuffer";
            this.request = request;
    
            var self = this;

            request.onload = function() {
                self.buffer = self.options.context.createBuffer(request.response, false);
                self.options.isLoaded = true;
            };

            request.send();
        },

        // Destroy an instantiated plugin and clean up
        // modifications the widget has made to the DOM
        _destroy: function () {
        }


    });

})(jQuery, window, document);
;/// <reference path="jquery-1.7.1-vsdoc.js" />
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
            var $self = $(this);
            var options = $(ui.draggable.context).attr('data-sample-options');
            var sampleOptions = JSON.parse(options);
            sampleOptions.track = Mashup.GetTrack($self);
            sampleOptions.rhythmIndex = Mashup.GetStartBeat($self);
            if ($(ui.draggable.context).attr('data-waveform')) {
                //configure sampleOptions here                
                sampleOptions.playDuration = $('#sampleWaveform').audioViewer('getEndTime') - $('#sampleWaveform').audioViewer('getStartTime');
                sampleOptions.trimStart = 0;                
                sampleOptions.id = new Date().getTime();
                sampleOptions.waveFormElement = '#sampleWaveform';
                Mashup.MoveSampleToPlayer(sampleOptions, $self);
                return;
            }
            if(typeof sampleOptions.playDuration === 'undefined')
                sampleOptions.playDuration = sampleOptions.duration;
            Mashup.MoveSampleToPlayer(sampleOptions, $self);
        }
    },
    maxSampleLength: 44100 * 4 * 90,//44.1kHz * 32bits * number of seconds allowed
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
    try {
        var sample = $playerDiv.audioSampleGraphical(sampleOptions);
        Mashup.Player.audioPlayerGraphical('addSample', sample);
    } catch(ex) {
        if (sample)
            sample.audioSampleGraphical('destroy');
        Mashup.ShowMessage("Schnikes!", ex);
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



;; (function ($, window, document, undefined) {

    $.widget("Mashup.myResizable", $.ui.mouse,{

        //Options to be used as defaults
        options: {
            resizeElement:null
        },
        _create: function () {
            this._mouseInit();
        },

        // need to override the mouse functions
	    _mouseStart: function(e){
		    // keep track of where the mouse started
	        this.originalMousePosition = e.pageY;
	        this.orginalResizeHeight = this.options.resizeElement.height();
	        this.originalTop = parseInt(this.element.css('top').replace("px",""));
	    },
	    _mouseDrag: function(e){
	        var mouseOffset = this.originalMousePosition - e.pageY;
	        this.options.resizeElement.height(this.orginalResizeHeight - mouseOffset);
	        this.element.css('top', this.originalTop - mouseOffset);
	    },

        _setOption: function (key, value) {
            switch (key) {
                case "someValue":
                    //this.options.someValue = doSomethingWith( value );
                    break;
                default:
                    //this.options[ key ] = value;
                    break;
            }

             this._super( "_setOption", key, value );
        },
        _destroy: function () {
        }

    });

})(jQuery, window, document);
