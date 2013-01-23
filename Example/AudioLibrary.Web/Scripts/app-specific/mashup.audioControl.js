/* File Created: March 30, 2012 */
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