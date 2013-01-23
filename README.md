#AudioLibraryJs
==============
This project contains several jquery plugin's - using the [jquery ui widget design pattern](http://ajpiano.com/widgetfactory/#slide1) - to easily create a [Web Audio API](https://dvcs.w3.org/hg/audio/raw-file/tip/webaudio/specification.html) based audio player and a Web Audio API based audio editor. These two plugin's can work side by side but don't necessarily need to.  Since it is web audio api based, the plugin only works on webkit browsers (Chrome/Safari on mac).

##Third Party Tools (Required)
==============

+ Jquery 1.8 (and later)
+ Jquery-ui-1.10 (only the core, draggable and droppable needed)
+ processing-1.4.1.js

#How to use
To attach the player to an element, simply add audioPlayerGraphical({:options}) to the jquery object. Example
####HTML
    <div id="player"></div>
    <div id="playerStop"></div>
    <div id="playerSave"></div>
    <div id="playerPlay"></div>
    <div id="playerReset"></div>
####Javascript
    $('#player').audioPlayerGraphical({
        bpm: 100,
        stopButton: '#playerStop',
        saveButton: '#playerSave',
        playButton: '#playerPlay',
        clearButton: '#playerReset'
      });

To use the audio editor, see the following example.
####HTML
    <div id="audioViewer">
        <canvas id="sampleTrim"></canvas>
        <canvas id="sampleWaveform"></canvas>
        <canvas id="samplePlayIndex"></canvas>
    </div>
    <div id="audioViewerControls">
        <button class="btn btn-mini btn-primary" id="samplePlay" title="Play/Stop">
            <i class="icon-play icon-white"></i>
        </button>
        <button class="btn btn-mini btn-primary" id="sampleZoomIn" title="Zoom In">
            <i class="icon-zoom-in icon-white"></i>
        </button>
        <button class="btn btn-mini btn-primary" id="sampleZoomOut" title="Zoom Out">
            <i class="icon-zoom-out icon-white"></i>
        </button>
        <div id="waveformSample" data-waveform="true">Drag to player when finished.</div>
    </div>
####Javascript
    //plug-in for viewer
    $('#sampleWaveform').audioViewer({
        playButton: '#samplePlay',
        zoomInButton: '#sampleZoomIn',
        zoomOutButton: '#sampleZoomOut',
        dropFileBox: '#sampleTrim'
    });
