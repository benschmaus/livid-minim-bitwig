/*

This script is for Livid's Minim bluetooth low energy (LE)
wireless MIDI controller.  It enables you to
use the Minim to select tracks, control playback, mute/record enable
tracks, control track volume, and launch scenes 1-8.

More at README.

*/

loadAPI(1);

host.defineController(
    "Factotumo", "Minim (Basic)",
    "1.0", "20df4278-0d6a-46e6-a158-fcfaa921260a"
);
host.defineMidiPorts(1, 0); // no midi out available at the moment

// set to 1 to enable console logging
var enableDebugLogging = 1;

function init() {

    var firstIn = host.getMidiInPort(0);
    
    firstIn.setMidiCallback(onMidi);
    firstIn.setSysexCallback(onSysex)

    // since we're using the note messages we don't
    // need them for note inputs
    //var noteInput = firstIn.createNoteInput("");
    //noteInput.setShouldConsumeEvents(false);  

    bitwig.transport = host.createTransport();

    bitwig.transport.addIsPlayingObserver(function(isPlaying) { bitwig.isPlaying = isPlaying; });
    bitwig.transport.addIsRecordingObserver(function(isRecording) { bitwig.isRecording = isRecording; });

    bitwig.trackBank = host.createMainTrackBank(8, 0, 8);

    bitwig.cursorTrack = host.createArrangerCursorTrack(8, 8);

    bitwig.minim = minim;
    /*for (p in bitwig.cursorTrack) {
        log(p);
    }*/
    /*
    // not sure how to control LED state for the touch fader for volume...
    bitwig.cursorTrack.getVolume().addValueDisplayObserver(
        3, "na", function(volume) {
            volume = Math.floor(volume); // need to scale to 0-127...
            log("volume=" + volume);
            if (volume != "na") {
                host.getMidiOutPort(0).sendMidi(176, 1, volume);
            }
        }
    );
    */

    bitwig.clipLauncherScenes = bitwig.trackBank.getClipLauncherScenes();

    log("init done.");
}

function onMidi(status, data1, data2) {
    //log("onMidi(status=" + status + ", data1=" + data1 + ", data2=" + data2 + ")");
    
    // we use note on messages from the Minim to control most behavior.
    // the touch fader sends CC1, which we use for volume.
    if (status == 0x90) {
        if (data2 > 0) {
            if (minim.isLeftColumnButton(data1) || minim.isSideButton(data1)) {
                minim.leftColumnNotesToActions[data1](bitwig);
            } else if (minim.isRectangleButton(data1)) {
                bitwig.trackBank.getTrack(minim.topAndBottomRectangleButtonToTrackMapping[data1]).getMute().toggle();
            } else {
                bitwig.toggleScene(data1);
            }
        }
    } else if (status == 0xB0) {
        if (minim.isTouchFader(data1)) {
            bitwig.cursorTrack.getVolume().set(data2, 128);
        }
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
bitwig.isPlaying = false;
bitwig.isRecording = false;
bitwig.sceneStates = {};

bitwig.toggleScene = function(noteMessage) {
     var sceneIdx = this.minim.topAndBottomPadsToTrackMapping[noteMessage];
     log("toggle scene for pad " + noteMessage + ", scene index " + sceneIdx);
     log("padPlaystate=" + minim.padPlaystate[noteMessage]);
     log("current playing pad=" + this.minim.currentPlayingPad);

     if (this.minim.padPlaystate[noteMessage]) {
        this.clipLauncherScenes.stop();
        this.transport.stop();
        this.minim.resetPadPlaystates();
     } else {        
        this.clipLauncherScenes.launch(sceneIdx);
        this.minim.padPlaystate[noteMessage] = true;
        if ((this.minim.currentPlayingPad != 0)) {
            this.minim.padPlaystate[this.minim.currentPlayingPad] = false;
        }
        this.minim.currentPlayingPad = noteMessage;
     }
     log("padPlaystate=" + this.minim.padPlaystate[noteMessage]);
}

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
    48: function (bitwig) {
        bitwig.cursorTrack.selectPrevious();
    },
    49: function (bitwig) {
        bitwig.cursorTrack.selectNext();
    },
    4:  function(bitwig) {
        bitwig.cursorTrack.getMute().toggle();
    },
    5:  function(bitwig) {
        bitwig.cursorTrack.getSolo().toggle();
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

minim.isSideButton = function(data1) {
    return data1 >= 48;
}

minim.isTouchFader = function(data1) {
    return data1 == 1;
}

minim.isRectangleButton = function(data1) {
    return ((data1 > 31) && (data1 < 36)) || ((data1 > 43) && (data1 < 48));
}
