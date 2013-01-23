; (function ($, window, document, undefined) {

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