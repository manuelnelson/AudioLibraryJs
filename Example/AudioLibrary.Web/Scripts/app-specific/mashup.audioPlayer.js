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






