; (function ($, window, document, undefined) {
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
        },

        _create: function () {
            var self = this;
            //if not initialized, take element width and height
            this.options.width = this.options.width ? this.options.width : $(this.element[0]).width();
            this.options.height = this.options.height ? this.options.height : $(this.element[0]).height();

            //this.audioPlayer = $('#audioViewerControls').audioPlayerWaveformViewer();
            var $audioPlayerDiv = $('<div/>').attr('id', 'audioViewerPlayer').addClass('hide');
            $('body').append($audioPlayerDiv);
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
        _getStartTime: function (forceIsSelected) {
            if (this._isSelected() || forceIsSelected) {
                //current start time of audio as shown in the viewer.
                var currViewerStartTime = this.startWaveform / this.totalWaveformLength * this.duration;
                return (this.processTrim.getMin() / this.options.width) * this.duration * this.waveformFraction + currViewerStartTime;
            }
            return this.startWaveform / this.totalWaveformLength * this.duration;
        },
        _getEndTime: function (forceIsSelected) {
            if (this._isSelected() || forceIsSelected) {
                //current start time of audio as shown in the viewer.
                var currViewerStartTime = this.startWaveform / this.totalWaveformLength * this.duration;
                return (this.processTrim.getMax() / this.options.width) * this.duration * this.waveformFraction + currViewerStartTime;
            }
            return this.endWaveform / this.totalWaveformLength * this.duration;

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
            var sampleDuration = this._getEndTime() - this._getStartTime();
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
            var blob = new Blob([equalizedArray], { type: 'text/plain' });
            return blob;
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
            var startTime = this._getStartTime(true);
            var endTime = this._getEndTime(true);
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






