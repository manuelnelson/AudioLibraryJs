/* File Created: March 19, 2012 */
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






