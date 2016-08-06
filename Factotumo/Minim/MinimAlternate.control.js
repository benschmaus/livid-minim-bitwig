/*

This script is for Livid's Minim bluetooth low energy (LE)
wireless MIDI controller.  It enables you to
use the Minim to select tracks, control playback, mute/record enable
tracks, control track volume, and launch scenes 1-8.

More at README.

*/

loadAPI(1);
load("../Framework4Bitwig/ClassLoader.js");

/*host.defineController(
    "Factotumo", "Minim (Alternate)",
    "1.0", "792aa97e-0b2c-4715-b42b-8f0b2ff4cc3e"
);*/
host.defineMidiPorts(1, 0); // no midi out available at the moment

// set to 1 to enable console logging
var enableDebugLogging = 1;

function init() {


    log("init done.");
}

function onMidi(status, data1, data2) {
    //log("onMidi(status=" + status + ", data1=" + data1 + ", data2=" + data2 + ")");
    
    // we use note on messages from the Minim to control most behavior.
    // the touch fader sends CC1, which we use for volume.
    if (status == 0x90) {
        if (data2 > 0) {
            if (minim.isLeftColumnButton(data1)) {
                minim.leftColumnNotesToActions[data1](bitwig);
            } else if (minim.isRectangleButton(data1)) {
                bitwig.trackBank.getTrack(minim.topAndBottomRectangleButtonToTrackMapping[data1]).getMute().toggle();
            } else {
                bitwig.toggleScene(data1);
            }
        }
    } else if (status == 0xB0) {
        bitwig.cursorTrack.getVolume().set(data2, 128);
    }
}

function onSysex(data) {
    log("data=" + data);
}

function exit() {
    log("exit.");
}

function log(msg) {
    if (enableDebugLogging) {
        println(msg);
    }
}

function dumpProps(obj) {
    for (p in obj) {
        log(p);
    }
}

var bitwig = {};

var minim = {};
minim.leftColumnNotesToActions = {
    2: function(bitwig) {
        //log("toggling playback");
        if (bitwig.isPlaying) {
            bitwig.transport.stop();
            this.parent.resetPadPlaystates();
        } else {
            bitwig.transport.play();
        }
        
    },
    3: function(bitwig) {
        //log("toggling record");
        if (bitwig.isRecording) {
            bitwig.transport.stop();
            this.parent.resetPadPlaystates();
        } else {
            bitwig.transport.record();
        }
    },
    4: function (bitwig) {
        bitwig.cursorTrack.selectPrevious();
    },
    5: function (bitwig) {
        bitwig.cursorTrack.selectNext();
    },
    6: function(bitwig) {
        bitwig.cursorTrack.getArm().toggle();
    }
};
minim.leftColumnNotesToActions.parent = minim;

minim.topAndBottomRectangleButtonToTrackMapping = {
    44: 0,
    45: 1,
    46: 2,
    47: 3,
    32: 4,
    33: 5,
    34: 6,
    35: 7
};

minim.topAndBottomPadsToTrackMapping = {
    40: 0,
    41: 1,
    42: 2,
    43: 3,
    36: 4,
    37: 5,
    38: 6,
    39: 7
};
// tracks whether the scene for a given pad is playing
minim.padPlaystate = {
    40: false,
    41: false,
    42: false,
    43: false,
    36: false,
    37: false,
    38: false,
    39: false
};
// keeps track of the note number of the current playing pad (if any)
minim.currentPlayingPad = 0;

minim.resetPadPlaystates = function() {
    for (pad in this.padPlaystate) {
        this.padPlaystate[pad] = false;
    }
    this.currentPlayingPad = 0;
}

minim.isLeftColumnButton = function(data1) {
    return ((data1 > 1) && (data1 < 7));
}

minim.isRectangleButton = function(data1) {
    return ((data1 > 31) && (data1 < 36)) || ((data1 > 43) && (data1 < 48));
}
