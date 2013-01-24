; (function ($, window, document, undefined) {
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






