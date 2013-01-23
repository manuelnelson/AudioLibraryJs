/* File Created: April 3, 2012 */
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