/*
  (c) 2012-2021 Noora Halme et al. (see AUTHORS)

  This code is licensed under the MIT license:
  http://www.opensource.org/licenses/mit-license.php

  Fast Tracker 2 module player class

  Reading material:
  - ftp://ftp.modland.com/pub/documents/format_documentation/FastTracker%202%20v2.04%20(.xm).html
  - http://sid.ethz.ch/debian/milkytracker/milkytracker-0.90.85%2Bdfsg/resources/reference/xm-form.txt
  - ftp://ftp.modland.com/pub/documents/format_documentation/Tracker%20differences%20for%20Coders.txt
  - http://wiki.openmpt.org/Manual:_Compatible_Playback

  Greets to Guru, Alfred and CCR for their work figuring out the .xm format. :)
*/


// helper functions for picking up signed, unsigned, little endian, etc from an unsigned 8-bit buffer
function le_word(buffer, offset) {
    return buffer[offset] | (buffer[offset + 1] << 8);
}
function le_dword(buffer, offset) {
    return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16) | (buffer[offset + 3] << 24);
}
function s_byte(buffer, offset) {
    return (buffer[offset] < 128) ? buffer[offset] : (buffer[offset] - 256);
}
function s_le_word(buffer, offset) {
    return (le_word(buffer, offset) < 32768) ? le_word(buffer, offset) : (le_word(buffer, offset) - 65536);
}

// convert from MS-DOS extended ASCII to Unicode
function dos2utf(c) {
    if (c < 128) return String.fromCharCode(c);
    var cs = [
        0x00c7, 0x00fc, 0x00e9, 0x00e2, 0x00e4, 0x00e0, 0x00e5, 0x00e7, 0x00ea, 0x00eb, 0x00e8, 0x00ef, 0x00ee, 0x00ec, 0x00c4, 0x00c5,
        0x00c9, 0x00e6, 0x00c6, 0x00f4, 0x00f6, 0x00f2, 0x00fb, 0x00f9, 0x00ff, 0x00d6, 0x00dc, 0x00f8, 0x00a3, 0x00d8, 0x00d7, 0x0192,
        0x00e1, 0x00ed, 0x00f3, 0x00fa, 0x00f1, 0x00d1, 0x00aa, 0x00ba, 0x00bf, 0x00ae, 0x00ac, 0x00bd, 0x00bc, 0x00a1, 0x00ab, 0x00bb,
        0x2591, 0x2592, 0x2593, 0x2502, 0x2524, 0x00c1, 0x00c2, 0x00c0, 0x00a9, 0x2563, 0x2551, 0x2557, 0x255d, 0x00a2, 0x00a5, 0x2510,
        0x2514, 0x2534, 0x252c, 0x251c, 0x2500, 0x253c, 0x00e3, 0x00c3, 0x255a, 0x2554, 0x2569, 0x2566, 0x2560, 0x2550, 0x256c, 0x00a4,
        0x00f0, 0x00d0, 0x00ca, 0x00cb, 0x00c8, 0x0131, 0x00cd, 0x00ce, 0x00cf, 0x2518, 0x250c, 0x2588, 0x2584, 0x00a6, 0x00cc, 0x2580,
        0x00d3, 0x00df, 0x00d4, 0x00d2, 0x00f5, 0x00d5, 0x00b5, 0x00fe, 0x00de, 0x00da, 0x00db, 0x00d9, 0x00fd, 0x00dd, 0x00af, 0x00b4,
        0x00ad, 0x00b1, 0x2017, 0x00be, 0x00b6, 0x00a7, 0x00f7, 0x00b8, 0x00b0, 0x00a8, 0x00b7, 0x00b9, 0x00b3, 0x00b2, 0x25a0, 0x00a0
    ];
    return String.fromCharCode(cs[c - 128]);
}



function Fasttracker() {
    var i, t;

    this.clearsong();
    this.initialize();

    this.playing = false;
    this.paused = false;
    this.repeat = false;

    this.filter = false;

    this.syncqueue = [];

    this.samplerate = 44100;
    this.ramplen = 64.0;

    this.mixval = 8.0;

    // amiga period value table
    this.periodtable = new Float32Array([
        //ft -8     -7     -6     -5     -4     -3     -2     -1
        //    0      1      2      3      4      5      6      7
        907.0, 900.0, 894.0, 887.0, 881.0, 875.0, 868.0, 862.0,  // B-3
        856.0, 850.0, 844.0, 838.0, 832.0, 826.0, 820.0, 814.0,  // C-4
        808.0, 802.0, 796.0, 791.0, 785.0, 779.0, 774.0, 768.0,  // C#4
        762.0, 757.0, 752.0, 746.0, 741.0, 736.0, 730.0, 725.0,  // D-4
        720.0, 715.0, 709.0, 704.0, 699.0, 694.0, 689.0, 684.0,  // D#4
        678.0, 675.0, 670.0, 665.0, 660.0, 655.0, 651.0, 646.0,  // E-4
        640.0, 636.0, 632.0, 628.0, 623.0, 619.0, 614.0, 610.0,  // F-4
        604.0, 601.0, 597.0, 592.0, 588.0, 584.0, 580.0, 575.0,  // F#4
        570.0, 567.0, 563.0, 559.0, 555.0, 551.0, 547.0, 543.0,  // G-4
        538.0, 535.0, 532.0, 528.0, 524.0, 520.0, 516.0, 513.0,  // G#4
        508.0, 505.0, 502.0, 498.0, 494.0, 491.0, 487.0, 484.0,  // A-4
        480.0, 477.0, 474.0, 470.0, 467.0, 463.0, 460.0, 457.0,  // A#4
        453.0, 450.0, 447.0, 445.0, 442.0, 439.0, 436.0, 433.0,  // B-4
        428.0
    ]);

    this.pan = new Float32Array(32);
    this.finalpan = new Float32Array(32);
    for (let i = 0; i < 32; i++) this.pan[i] = this.finalpan[i] = 0.5;

    // calc tables for vibrato waveforms
    this.vibratotable = new Array();
    for (t = 0; t < 4; t++) {
        this.vibratotable[t] = new Float32Array(64);
        for (let i = 0; i < 64; i++) {
            switch (t) {
                case 0:
                    this.vibratotable[t][i] = 127 * Math.sin(Math.PI * 2 * (i / 64));
                    break;
                case 1:
                    this.vibratotable[t][i] = 127 - 4 * i;
                    break;
                case 2:
                    this.vibratotable[t][i] = (i < 32) ? 127 : -127;
                    break;
                case 3:
                    this.vibratotable[t][i] = (1 - 2 * Math.random()) * 127;
                    break;
            }
        }
    }

    // volume column effect jumptable for 0x50..0xef
    this.voleffects_t0 = new Array(
        this.effect_vol_t0_f0.bind(this),
        this.effect_vol_t0_60.bind(this), this.effect_vol_t0_70.bind(this), this.effect_vol_t0_80.bind(this), this.effect_vol_t0_90.bind(this), this.effect_vol_t0_a0.bind(this),
        this.effect_vol_t0_b0.bind(this), this.effect_vol_t0_c0.bind(this), this.effect_vol_t0_d0.bind(this), this.effect_vol_t0_e0.bind(this)
    );
    this.voleffects_t1 = new Array(
        this.effect_vol_t1_f0.bind(this),
        this.effect_vol_t1_60.bind(this), this.effect_vol_t1_70.bind(this), this.effect_vol_t1_80.bind(this), this.effect_vol_t1_90.bind(this), this.effect_vol_t1_a0.bind(this),
        this.effect_vol_t1_b0.bind(this), this.effect_vol_t1_c0.bind(this), this.effect_vol_t1_d0.bind(this), this.effect_vol_t1_e0.bind(this)
    );

    // effect jumptables for tick 0 and ticks 1..f
    this.effects_t0 = new Array(
        this.effect_t0_0.bind(this), this.effect_t0_1.bind(this), this.effect_t0_2.bind(this), this.effect_t0_3.bind(this), this.effect_t0_4.bind(this), this.effect_t0_5.bind(this), this.effect_t0_6.bind(this), this.effect_t0_7.bind(this),
        this.effect_t0_8.bind(this), this.effect_t0_9.bind(this), this.effect_t0_a.bind(this), this.effect_t0_b.bind(this), this.effect_t0_c.bind(this), this.effect_t0_d.bind(this), this.effect_t0_e.bind(this), this.effect_t0_f.bind(this),
        this.effect_t0_g.bind(this), this.effect_t0_h.bind(this), this.effect_t0_i.bind(this), this.effect_t0_j.bind(this), this.effect_t0_k.bind(this), this.effect_t0_l.bind(this), this.effect_t0_m.bind(this), this.effect_t0_n.bind(this),
        this.effect_t0_o.bind(this), this.effect_t0_p.bind(this), this.effect_t0_q.bind(this), this.effect_t0_r.bind(this), this.effect_t0_s.bind(this), this.effect_t0_t.bind(this), this.effect_t0_u.bind(this), this.effect_t0_v.bind(this),
        this.effect_t0_w.bind(this), this.effect_t0_x.bind(this), this.effect_t0_y.bind(this), this.effect_t0_z.bind(this)
    );
    this.effects_t0_e = new Array(
        this.effect_t0_e0.bind(this), this.effect_t0_e1.bind(this), this.effect_t0_e2.bind(this), this.effect_t0_e3.bind(this), this.effect_t0_e4.bind(this), this.effect_t0_e5.bind(this), this.effect_t0_e6.bind(this), this.effect_t0_e7.bind(this),
        this.effect_t0_e8.bind(this), this.effect_t0_e9.bind(this), this.effect_t0_ea.bind(this), this.effect_t0_eb.bind(this), this.effect_t0_ec.bind(this), this.effect_t0_ed.bind(this), this.effect_t0_ee.bind(this), this.effect_t0_ef.bind(this)
    );
    this.effects_t1 = new Array(
        this.effect_t1_0.bind(this), this.effect_t1_1.bind(this), this.effect_t1_2.bind(this), this.effect_t1_3.bind(this), this.effect_t1_4.bind(this), this.effect_t1_5.bind(this), this.effect_t1_6.bind(this), this.effect_t1_7.bind(this),
        this.effect_t1_8.bind(this), this.effect_t1_9.bind(this), this.effect_t1_a.bind(this), this.effect_t1_b.bind(this), this.effect_t1_c.bind(this), this.effect_t1_d.bind(this), this.effect_t1_e.bind(this), this.effect_t1_f.bind(this),
        this.effect_t1_g.bind(this), this.effect_t1_h.bind(this), this.effect_t1_i.bind(this), this.effect_t1_j.bind(this), this.effect_t1_k.bind(this), this.effect_t1_l.bind(this), this.effect_t1_m.bind(this), this.effect_t1_n.bind(this),
        this.effect_t1_o.bind(this), this.effect_t1_p.bind(this), this.effect_t1_q.bind(this), this.effect_t1_r.bind(this), this.effect_t1_s.bind(this), this.effect_t1_t.bind(this), this.effect_t1_u.bind(this), this.effect_t1_v.bind(this),
        this.effect_t1_w.bind(this), this.effect_t1_x.bind(this), this.effect_t1_y.bind(this), this.effect_t1_z.bind(this)
    );
    this.effects_t1_e = new Array(
        this.effect_t1_e0.bind(this), this.effect_t1_e1.bind(this), this.effect_t1_e2.bind(this), this.effect_t1_e3.bind(this), this.effect_t1_e4.bind(this), this.effect_t1_e5.bind(this), this.effect_t1_e6.bind(this), this.effect_t1_e7.bind(this),
        this.effect_t1_e8.bind(this), this.effect_t1_e9.bind(this), this.effect_t1_ea.bind(this), this.effect_t1_eb.bind(this), this.effect_t1_ec.bind(this), this.effect_t1_ed.bind(this), this.effect_t1_ee.bind(this), this.effect_t1_ef.bind(this)
    );
}



// clear song data
Fasttracker.prototype.clearsong = function () {
    var i;

    this.title = "";
    this.signature = "";
    this.trackerversion = 0x0104;

    this.songlen = 1;
    this.repeatpos = 0;

    this.channels = 0;
    this.patterns = 0;
    this.instruments = 32;

    this.amigaperiods = 0;

    this.initSpeed = 6;
    this.initBPM = 125;

    this.patterntable = new ArrayBuffer(256);
    for (let i = 0; i < 256; i++) this.patterntable[i] = 0;

    this.pattern = new Array();
    this.instrument = new Array(this.instruments);
    for (let i = 0; i < 32; i++) {
        this.instrument[i] = new Object();
        this.instrument[i].name = "";
        this.instrument[i].samples = new Array();
    }

    this.chvu = new Float32Array(2);
}



// initialize all player variables to defaults prior to starting playback
Fasttracker.prototype.initialize = function () {
    this.syncqueue = [];

    this.tick = -1;
    this.position = 0;
    this.row = 0;
    this.flags = 0;

    this.volume = 64;
    if (this.initSpeed) this.speed = this.initSpeed;
    if (this.initBPM) this.bpm = this.initBPM;
    this.stt = 0; //this.samplerate/(this.bpm*0.4);
    this.breakrow = 0;
    this.patternjump = 0;
    this.patterndelay = 0;
    this.patternwait = 0;
    this.endofsong = false;
    this.looprow = 0;
    this.loopstart = 0;
    this.loopcount = 0;

    this.globalvolslide = 0;

    this.channel = new Array();
    for (let i = 0; i < this.channels; i++) {
        this.channel[i] = new Object();

        this.channel[i].instrument = 0;
        this.channel[i].sampleindex = 0;

        this.channel[i].note = 36;
        this.channel[i].command = 0;
        this.channel[i].data = 0;
        this.channel[i].samplepos = 0;
        this.channel[i].samplespeed = 0;
        this.channel[i].flags = 0;
        this.channel[i].noteon = 0;

        this.channel[i].volslide = 0;
        this.channel[i].slidespeed = 0;
        this.channel[i].slideto = 0;
        this.channel[i].slidetospeed = 0;
        this.channel[i].arpeggio = 0;

        this.channel[i].period = 640;
        this.channel[i].frequency = 8363;

        this.channel[i].volume = 64;
        this.channel[i].voiceperiod = 0;
        this.channel[i].voicevolume = 0;
        this.channel[i].finalvolume = 0;

        this.channel[i].semitone = 12;
        this.channel[i].vibratospeed = 0
        this.channel[i].vibratodepth = 0
        this.channel[i].vibratopos = 0;
        this.channel[i].vibratowave = 0;

        this.channel[i].volramp = 1.0;
        this.channel[i].volrampfrom = 0;

        this.channel[i].volenvpos = 0;
        this.channel[i].panenvpos = 0;
        this.channel[i].fadeoutpos = 0;

        this.channel[i].playdir = 1;

        // interpolation/ramps
        this.channel[i].volramp = 0;
        this.channel[i].volrampfrom = 0;
        this.channel[i].trigramp = 0;
        this.channel[i].trigrampfrom = 0.0;
        this.channel[i].currentsample = 0.0;
        this.channel[i].lastsample = 0.0;
        this.channel[i].oldfinalvolume = 0.0;
    }
}



// parse the module from local buffer
Fasttracker.prototype.parse = function (buffer) {
    var i, j, k, c, offset, datalen, hdrlen;

    if (!buffer) return false;

    // check xm signature, type and tracker version
    for (let i = 0; i < 17; i++) this.signature += String.fromCharCode(buffer[i]);
    if (this.signature != "Extended Module: ") return false;
    if (buffer[37] != 0x1a) return false;
    this.signature = "X.M.";
    this.trackerversion = le_word(buffer, 58);
    if (this.trackerversion < 0x0104) return false; // older versions not currently supported

    // song title
    i = 0;
    while (buffer[i] && i < 20) this.title += dos2utf(buffer[17 + i++]);

    offset = 60;
    hdrlen = le_dword(buffer, offset);
    this.songlen = le_word(buffer, offset + 4);
    this.repeatpos = le_word(buffer, offset + 6);
    this.channels = le_word(buffer, offset + 8);
    this.patterns = le_word(buffer, offset + 10);
    this.instruments = le_word(buffer, offset + 12);

    this.amigaperiods = (!le_word(buffer, offset + 14)) & 1;

    this.initSpeed = le_word(buffer, offset + 16);
    this.initBPM = le_word(buffer, offset + 18);

    var maxpatt = 0;
    for (let i = 0; i < 256; i++) {
        this.patterntable[i] = buffer[offset + 20 + i];
        if (this.patterntable[i] > maxpatt) maxpatt = this.patterntable[i];
    }
    maxpatt++;

    // allocate arrays for pattern data
    this.pattern = new Array(maxpatt);
    this.patternlen = new Array(maxpatt);

    for (let i = 0; i < maxpatt; i++) {
        // initialize the pattern to defaults prior to unpacking
        this.patternlen[i] = 64;
        this.pattern[i] = new Uint8Array(this.channels * this.patternlen[i] * 5);
        for (let row = 0; row < this.patternlen[i]; row++) for (let ch = 0; ch < this.channels; ch++) {
            this.pattern[i][row * this.channels * 5 + ch * 5 + 0] = 255; // note (255=no note)
            this.pattern[i][row * this.channels * 5 + ch * 5 + 1] = 0; // instrument
            this.pattern[i][row * this.channels * 5 + ch * 5 + 2] = 255 // volume
            this.pattern[i][row * this.channels * 5 + ch * 5 + 3] = 255; // command
            this.pattern[i][row * this.channels * 5 + ch * 5 + 4] = 0; // parameter
        }
    }

    // load and unpack patterns
    offset += hdrlen; // initial offset for patterns
    i = 0;
    while (i < this.patterns) {
        this.patternlen[i] = le_word(buffer, offset + 5);
        this.pattern[i] = new Uint8Array(this.channels * this.patternlen[i] * 5);

        // initialize pattern to defaults prior to unpacking
        for (k = 0; k < (this.patternlen[i] * this.channels); k++) {
            this.pattern[i][k * 5 + 0] = 0; // note
            this.pattern[i][k * 5 + 1] = 0; // instrument
            this.pattern[i][k * 5 + 2] = 0; // volume
            this.pattern[i][k * 5 + 3] = 0; // command
            this.pattern[i][k * 5 + 4] = 0; // parameter
        }

        datalen = le_word(buffer, offset + 7);
        offset += le_dword(buffer, offset); // jump over header
        j = 0; k = 0;
        while (j < datalen) {
            c = buffer[offset + j++];
            if (c & 128) {
                // first byte is a bitmask
                if (c & 1) this.pattern[i][k + 0] = buffer[offset + j++];
                if (c & 2) this.pattern[i][k + 1] = buffer[offset + j++];
                if (c & 4) this.pattern[i][k + 2] = buffer[offset + j++];
                if (c & 8) this.pattern[i][k + 3] = buffer[offset + j++];
                if (c & 16) this.pattern[i][k + 4] = buffer[offset + j++];
            } else {
                // first byte is note -> all columns present sequentially
                this.pattern[i][k + 0] = c;
                this.pattern[i][k + 1] = buffer[offset + j++];
                this.pattern[i][k + 2] = buffer[offset + j++];
                this.pattern[i][k + 3] = buffer[offset + j++];
                this.pattern[i][k + 4] = buffer[offset + j++];
            }
            k += 5;
        }

        for (k = 0; k < (this.patternlen[i] * this.channels * 5); k += 5) {
            // remap note to st3-style, 255=no note, 254=note off
            if (this.pattern[i][k + 0] >= 97) {
                this.pattern[i][k + 0] = 254;
            } else if (this.pattern[i][k + 0] == 0) {
                this.pattern[i][k + 0] = 255;
            } else {
                this.pattern[i][k + 0]--;
            }

            // command 255=no command
            if (this.pattern[i][k + 3] == 0 && this.pattern[i][k + 4] == 0) this.pattern[i][k + 3] = 255;

            // remap volume column setvol to 0x00..0x40, tone porta to 0x50..0x5f and 0xff for nop
            if (this.pattern[i][k + 2] < 0x10) { this.pattern[i][k + 2] = 0xff; }
            else if (this.pattern[i][k + 2] >= 0x10 && this.pattern[i][k + 2] <= 0x50) { this.pattern[i][k + 2] -= 0x10; }
            else if (this.pattern[i][k + 2] >= 0xf0) this.pattern[i][k + 2] -= 0xa0;
        }

        // unpack next pattern
        offset += j;
        i++;
    }
    this.patterns = maxpatt;

    // instruments
    this.instrument = new Array(this.instruments);
    i = 0;
    while (i < this.instruments) {
        hdrlen = le_dword(buffer, offset);
        this.instrument[i] = new Object();
        this.instrument[i].sample = new Array();
        this.instrument[i].name = "";
        j = 0;
        while (buffer[offset + 4 + j] && j < 22)
            this.instrument[i].name += dos2utf(buffer[offset + 4 + j++]);
        this.instrument[i].samples = le_word(buffer, offset + 27);

        // initialize to defaults
        this.instrument[i].samplemap = new Uint8Array(96);
        for (j = 0; j < 96; j++) this.instrument[i].samplemap[j] = 0;
        this.instrument[i].volenv = new Float32Array(325);
        this.instrument[i].panenv = new Float32Array(325);
        this.instrument[i].voltype = 0;
        this.instrument[i].pantype = 0;
        for (j = 0; j <= this.instrument[i].samples; j++) {
            this.instrument[i].sample[j] = {
                bits: 8, stereo: 0, bps: 1,
                length: 0, loopstart: 0, looplength: 0, loopend: 0, looptype: 0,
                volume: 64, finetune: 0, relativenote: 0, panning: 128, name: "",
                data: new Float32Array(0)
            };
        }

        if (this.instrument[i].samples) {
            var smphdrlen = le_dword(buffer, offset + 29);

            for (j = 0; j < 96; j++) this.instrument[i].samplemap[j] = buffer[offset + 33 + j];

            // envelope points. the xm specs say 48 bytes per envelope, but while that may
            // technically be correct, what they don't say is that it means 12 pairs of
            // little endian words. first word is the x coordinate, second is y. point
            // 0 always has x=0.
            var tmp_volenv = new Array(12);
            var tmp_panenv = new Array(12);
            for (j = 0; j < 12; j++) {
                tmp_volenv[j] = new Uint16Array([le_word(buffer, offset + 129 + j * 4), le_word(buffer, offset + 129 + j * 4 + 2)]);
                tmp_panenv[j] = new Uint16Array([le_word(buffer, offset + 177 + j * 4), le_word(buffer, offset + 177 + j * 4 + 2)]);
            }

            // are envelopes enabled?
            this.instrument[i].voltype = buffer[offset + 233]; // 1=enabled, 2=sustain, 4=loop
            this.instrument[i].pantype = buffer[offset + 234];

            // pre-interpolate the envelopes to arrays of [0..1] float32 values which
            // are stepped through at a rate of one per tick. max tick count is 0x0144.

            // volume envelope
            for (j = 0; j < 325; j++) this.instrument[i].volenv[j] = 1.0;
            if (this.instrument[i].voltype & 1) {
                for (j = 0; j < 325; j++) {
                    var p, delta;
                    p = 1;
                    while (tmp_volenv[p][0] < j && p < 11) p++;
                    if (tmp_volenv[p][0] == tmp_volenv[p - 1][0]) { delta = 0; } else {
                        delta = (tmp_volenv[p][1] - tmp_volenv[p - 1][1]) / (tmp_volenv[p][0] - tmp_volenv[p - 1][0]);
                    }
                    this.instrument[i].volenv[j] = (tmp_volenv[p - 1][1] + delta * (j - tmp_volenv[p - 1][0])) / 64.0;
                }
                this.instrument[i].volenvlen = tmp_volenv[Math.max(0, buffer[offset + 225] - 1)][0];
                this.instrument[i].volsustain = tmp_volenv[buffer[offset + 227]][0];
                this.instrument[i].volloopstart = tmp_volenv[buffer[offset + 228]][0];
                this.instrument[i].volloopend = tmp_volenv[buffer[offset + 229]][0];
            }

            // pan envelope
            for (j = 0; j < 325; j++) this.instrument[i].panenv[j] = 0.5;
            if (this.instrument[i].pantype & 1) {
                for (j = 0; j < 325; j++) {
                    var p, delta;
                    p = 1;
                    while (tmp_panenv[p][0] < j && p < 11) p++;
                    if (tmp_panenv[p][0] == tmp_panenv[p - 1][0]) { delta = 0; } else {
                        delta = (tmp_panenv[p][1] - tmp_panenv[p - 1][1]) / (tmp_panenv[p][0] - tmp_panenv[p - 1][0]);
                    }
                    this.instrument[i].panenv[j] = (tmp_panenv[p - 1][1] + delta * (j - tmp_panenv[p - 1][0])) / 64.0;
                }
                this.instrument[i].panenvlen = tmp_panenv[Math.max(0, buffer[offset + 226] - 1)][0];
                this.instrument[i].pansustain = tmp_panenv[buffer[offset + 230]][0];
                this.instrument[i].panloopstart = tmp_panenv[buffer[offset + 231]][0];
                this.instrument[i].panloopend = tmp_panenv[buffer[offset + 232]][0];
            }

            // vibrato
            this.instrument[i].vibratotype = buffer[offset + 235];
            this.instrument[i].vibratosweep = buffer[offset + 236];
            this.instrument[i].vibratodepth = buffer[offset + 237];
            this.instrument[i].vibratorate = buffer[offset + 238];

            // volume fade out
            this.instrument[i].volfadeout = le_word(buffer, offset + 239);

            // sample headers
            offset += hdrlen;
            this.instrument[i].sample = new Array(this.instrument[i].samples);
            for (j = 0; j < this.instrument[i].samples; j++) {
                datalen = le_dword(buffer, offset + 0);

                this.instrument[i].sample[j] = new Object();
                this.instrument[i].sample[j].bits = (buffer[offset + 14] & 16) ? 16 : 8;
                this.instrument[i].sample[j].stereo = 0;
                this.instrument[i].sample[j].bps = (this.instrument[i].sample[j].bits == 16) ? 2 : 1; // bytes per sample

                // sample length and loop points are in BYTES even for 16-bit samples!
                this.instrument[i].sample[j].length = datalen / this.instrument[i].sample[j].bps;
                this.instrument[i].sample[j].loopstart = le_dword(buffer, offset + 4) / this.instrument[i].sample[j].bps;
                this.instrument[i].sample[j].looplength = le_dword(buffer, offset + 8) / this.instrument[i].sample[j].bps;
                this.instrument[i].sample[j].loopend = this.instrument[i].sample[j].loopstart + this.instrument[i].sample[j].looplength;
                this.instrument[i].sample[j].looptype = buffer[offset + 14] & 0x03;

                this.instrument[i].sample[j].volume = buffer[offset + 12];

                // finetune and seminote tuning
                if (buffer[offset + 13] < 128) {
                    this.instrument[i].sample[j].finetune = buffer[offset + 13];
                } else {
                    this.instrument[i].sample[j].finetune = buffer[offset + 13] - 256;
                }
                if (buffer[offset + 16] < 128) {
                    this.instrument[i].sample[j].relativenote = buffer[offset + 16];
                } else {
                    this.instrument[i].sample[j].relativenote = buffer[offset + 16] - 256;
                }

                this.instrument[i].sample[j].panning = buffer[offset + 15];

                k = 0; this.instrument[i].sample[j].name = "";
                while (buffer[offset + 18 + k] && k < 22) this.instrument[i].sample[j].name += dos2utf(buffer[offset + 18 + k++]);

                offset += smphdrlen;
            }

            // sample data (convert to signed float32)
            for (j = 0; j < this.instrument[i].samples; j++) {
                this.instrument[i].sample[j].data = new Float32Array(this.instrument[i].sample[j].length);
                c = 0;
                if (this.instrument[i].sample[j].bits == 16) {
                    for (k = 0; k < this.instrument[i].sample[j].length; k++) {
                        c += s_le_word(buffer, offset + k * 2);
                        if (c < -32768) c += 65536;
                        if (c > 32767) c -= 65536;
                        this.instrument[i].sample[j].data[k] = c / 32768.0;
                    }
                } else {
                    for (k = 0; k < this.instrument[i].sample[j].length; k++) {
                        c += s_byte(buffer, offset + k);
                        if (c < -128) c += 256;
                        if (c > 127) c -= 256;
                        this.instrument[i].sample[j].data[k] = c / 128.0;
                    }
                }
                offset += this.instrument[i].sample[j].length * this.instrument[i].sample[j].bps;
            }
        } else {
            offset += hdrlen;
        }
        i++;
    }

    this.mixval = 4.0 - 2.0 * (this.channels / 32.0);

    this.chvu = new Float32Array(this.channels);
    for (let i = 0; i < this.channels; i++) this.chvu[i] = 0.0;

    return true;
}



// calculate period value for note
Fasttracker.prototype.calcperiod = function (mod, note, finetune) {
    var pv;
    if (mod.amigaperiods) {
        var ft = Math.floor(finetune / 16.0); // = -8 .. 7
        var p1 = mod.periodtable[8 + (note % 12) * 8 + ft];
        var p2 = mod.periodtable[8 + (note % 12) * 8 + ft + 1];
        ft = (finetune / 16.0) - ft;
        pv = ((1.0 - ft) * p1 + ft * p2) * (16.0 / Math.pow(2, Math.floor(note / 12) - 1));
    } else {
        pv = 7680.0 - note * 64.0 - finetune / 2;
    }
    return pv;
}



// advance player by a tick
Fasttracker.prototype.advance = function (mod) {

    mod.stt = Math.floor((125.0 / mod.bpm) * (1 / 50.0) * mod.samplerate); // 50Hz

    // advance player
    mod.tick++;
    mod.flags |= 1;

    // new row on this tick?
    if (mod.tick >= mod.speed) {
        if (mod.patterndelay) { // delay pattern
            if (mod.tick < ((mod.patternwait + 1) * mod.speed)) {
                mod.patternwait++;
            } else {
                mod.row++; mod.tick = 0; mod.flags |= 2; mod.patterndelay = 0;
            }
        } else {
            if (mod.flags & (16 + 32 + 64)) {
                if (mod.flags & 64) { // loop pattern?
                    mod.row = mod.looprow;
                    mod.flags &= 0xa1;
                    mod.flags |= 2;
                } else {
                    if (mod.flags & 16) { // pattern jump/break?
                        mod.position = mod.patternjump;
                        mod.row = mod.breakrow;
                        mod.patternjump = 0;
                        mod.breakrow = 0;
                        mod.flags &= 0xe1;
                        mod.flags |= 2;
                    }
                }
                mod.tick = 0;
            } else {
                mod.row++; mod.tick = 0; mod.flags |= 2;
            }
        }
    }

    // step to new pattern?
    if (mod.row >= mod.patternlen[mod.patterntable[mod.position]]) {
        mod.position++;
        mod.row = 0;
        mod.flags |= 4;
    }

    // end of song?
    if (mod.position >= mod.songlen) {
        if (mod.repeat) {
            mod.position = 0;
        } else {
            this.endofsong = true;
        }
        return;
    }
}



// process one channel on a row in pattern p, pp is an offset to pattern data
Fasttracker.prototype.process_note = function (mod, p, ch) {
    var n, i, s, v, pp, pv;

    pp = mod.row * 5 * mod.channels + ch * 5;
    n = mod.pattern[p][pp];
    i = mod.pattern[p][pp + 1];
    if (i && i <= mod.instrument.length) {
        mod.channel[ch].instrument = i - 1;

        if (mod.instrument[i - 1].samples) {
            s = mod.instrument[i - 1].samplemap[mod.channel[ch].note];
            mod.channel[ch].sampleindex = s;
            mod.channel[ch].volume = mod.instrument[i - 1].sample[s].volume;
            mod.channel[ch].playdir = 1; // fixes crash in respirator.xm pos 0x12

            // set pan from sample
            mod.pan[ch] = mod.instrument[i - 1].sample[s].panning / 255.0;
        }
        mod.channel[ch].voicevolume = mod.channel[ch].volume;
    }
    i = mod.channel[ch].instrument;

    if (n < 254) {
        // look up the sample
        s = mod.instrument[i].samplemap[n];
        mod.channel[ch].sampleindex = s;

        var rn = n + mod.instrument[i].sample[s].relativenote;

        // calc period for note
        pv = mod.calcperiod(mod, rn, mod.instrument[i].sample[s].finetune);

        if (mod.channel[ch].noteon) {
            // retrig note, except if command=0x03 (porta to note) or 0x05 (porta+volslide)
            if ((mod.channel[ch].command != 0x03) && (mod.channel[ch].command != 0x05)) {
                mod.channel[ch].note = n;
                mod.channel[ch].period = pv;
                mod.channel[ch].voiceperiod = mod.channel[ch].period;
                mod.channel[ch].flags |= 3; // force sample speed recalc

                mod.channel[ch].trigramp = 0.0;
                mod.channel[ch].trigrampfrom = mod.channel[ch].currentsample;

                mod.channel[ch].samplepos = 0;
                mod.channel[ch].playdir = 1;
                if (mod.channel[ch].vibratowave > 3) mod.channel[ch].vibratopos = 0;

                mod.channel[ch].noteon = 1;

                mod.channel[ch].fadeoutpos = 65535;
                mod.channel[ch].volenvpos = 0;
                mod.channel[ch].panenvpos = 0;
            }
        } else {
            // note is off, restart but don't set period if slide command
            if (mod.pattern[p][pp + 1]) { // instrument set on row?
                mod.channel[ch].samplepos = 0;
                mod.channel[ch].playdir = 1;
                if (mod.channel[ch].vibratowave > 3) mod.channel[ch].vibratopos = 0;
                mod.channel[ch].noteon = 1;
                mod.channel[ch].fadeoutpos = 65535;
                mod.channel[ch].volenvpos = 0;
                mod.channel[ch].panenvpos = 0;
                mod.channel[ch].trigramp = 0.0;
                mod.channel[ch].trigrampfrom = mod.channel[ch].currentsample;
            }
            if ((mod.channel[ch].command != 0x03) && (mod.channel[ch].command != 0x05)) {
                mod.channel[ch].note = n;
                mod.channel[ch].period = pv;
                mod.channel[ch].voiceperiod = mod.channel[ch].period;
                mod.channel[ch].flags |= 3; // force sample speed recalc
            }
        }
        // in either case, set the slide to note target to note period
        mod.channel[ch].slideto = pv;
    } else if (n == 254) {
        mod.channel[ch].noteon = 0; // note off
        if (!(mod.instrument[i].voltype & 1)) mod.channel[ch].voicevolume = 0;
    }

    if (mod.pattern[p][pp + 2] != 255) {
        v = mod.pattern[p][pp + 2];
        if (v <= 0x40) {
            mod.channel[ch].volume = v;
            mod.channel[ch].voicevolume = mod.channel[ch].volume;
        }
    }
}



// advance player and all channels by a tick
Fasttracker.prototype.process_tick = function (mod) {

    // advance global player state by a tick
    mod.advance(mod);

    // advance all channels by a tick
    for (var ch = 0; ch < mod.channels; ch++) {

        // calculate playback position
        var p = mod.patterntable[mod.position];
        var pp = mod.row * 5 * mod.channels + ch * 5;

        // save old volume if ramping is needed
        mod.channel[ch].oldfinalvolume = mod.channel[ch].finalvolume;

        if (mod.flags & 2) { // new row on this tick?
            mod.channel[ch].command = mod.pattern[p][pp + 3];
            mod.channel[ch].data = mod.pattern[p][pp + 4];
            if (!(mod.channel[ch].command == 0x0e && (mod.channel[ch].data & 0xf0) == 0xd0)) { // note delay?
                mod.process_note(mod, p, ch);
            }
        }
        const i = mod.channel[ch].instrument;
        const si = mod.channel[ch].sampleindex;

        // kill empty instruments
        if (mod.channel[ch].noteon && !mod.instrument[i].samples) {
            mod.channel[ch].noteon = 0;
        }

        // effects
        var v = mod.pattern[p][pp + 2];
        if (v >= 0x50 && v < 0xf0) {
            if (!mod.tick) mod.voleffects_t0[(v >> 4) - 5](mod, ch, v & 0x0f);
            else mod.voleffects_t1[(v >> 4) - 5](mod, ch, v & 0x0f);
        }
        if (mod.channel[ch].command < 36) {
            if (!mod.tick) {
                // process only on tick 0
                mod.effects_t0[mod.channel[ch].command](mod, ch);
            } else {
                mod.effects_t1[mod.channel[ch].command](mod, ch);
            }
        }

        // recalc sample speed if voiceperiod has changed
        if ((mod.channel[ch].flags & 1 || mod.flags & 2) && mod.channel[ch].voiceperiod) {
            var f;
            if (mod.amigaperiods) {
                f = 8287.137 * 1712.0 / mod.channel[ch].voiceperiod;
            } else {
                f = 8287.137 * Math.pow(2.0, (4608.0 - mod.channel[ch].voiceperiod) / 768.0);
            }
            mod.channel[ch].samplespeed = f / mod.samplerate;
        }

        // advance vibrato on each new tick
        mod.channel[ch].vibratopos += mod.channel[ch].vibratospeed;
        mod.channel[ch].vibratopos &= 0x3f;

        // advance volume envelope, if enabled (also fadeout)
        if (mod.instrument[i].voltype & 1) {
            mod.channel[ch].volenvpos++;

            if (mod.channel[ch].noteon &&
                (mod.instrument[i].voltype & 2) &&
                mod.channel[ch].volenvpos >= mod.instrument[i].volsustain)
                mod.channel[ch].volenvpos = mod.instrument[i].volsustain;

            if ((mod.instrument[i].voltype & 4) &&
                mod.channel[ch].volenvpos >= mod.instrument[i].volloopend)
                mod.channel[ch].volenvpos = mod.instrument[i].volloopstart;

            if (mod.channel[ch].volenvpos >= mod.instrument[i].volenvlen)
                mod.channel[ch].volenvpos = mod.instrument[i].volenvlen;

            if (mod.channel[ch].volenvpos > 324) mod.channel[ch].volenvpos = 324;

            // fadeout if note is off
            if (!mod.channel[ch].noteon && mod.channel[ch].fadeoutpos) {
                mod.channel[ch].fadeoutpos -= mod.instrument[i].volfadeout;
                if (mod.channel[ch].fadeoutpos < 0) mod.channel[ch].fadeoutpos = 0;
            }
        }

        // advance pan envelope, if enabled
        if (mod.instrument[i].pantype & 1) {
            mod.channel[ch].panenvpos++;

            if (mod.channel[ch].noteon &&
                mod.instrument[i].pantype & 2 &&
                mod.channel[ch].panenvpos >= mod.instrument[i].pansustain)
                mod.channel[ch].panenvpos = mod.instrument[i].pansustain;

            if (mod.instrument[i].pantype & 4 &&
                mod.channel[ch].panenvpos >= mod.instrument[i].panloopend)
                mod.channel[ch].panenvpos = mod.instrument[i].panloopstart;

            if (mod.channel[ch].panenvpos >= mod.instrument[i].panenvlen)
                mod.channel[ch].panenvpos = mod.instrument[i].panenvlen;

            if (mod.channel[ch].panenvpos > 324) mod.channel[ch].panenvpos = 324;
        }

        // calc final volume for channel
        mod.channel[ch].finalvolume = mod.channel[ch].voicevolume * mod.instrument[i].volenv[mod.channel[ch].volenvpos] * mod.channel[ch].fadeoutpos / 65536.0;

        // calc final panning for channel
        mod.finalpan[ch] = mod.pan[ch] + (mod.instrument[i].panenv[mod.channel[ch].panenvpos] - 0.5) * (0.5 * Math.abs(mod.pan[ch] - 0.5)) * 2.0;

        // setup volramp if voice volume changed
        if (mod.channel[ch].oldfinalvolume != mod.channel[ch].finalvolume) {
            mod.channel[ch].volrampfrom = mod.channel[ch].oldfinalvolume;
            mod.channel[ch].volramp = 0.0;
        }

        // clear channel flags
        mod.channel[ch].flags = 0;
    }

    // clear global flags after all channels are processed
    mod.flags &= 0x70;
}



// mix a buffer of audio for an audio processing event
Fasttracker.prototype.mix = function (mod, bufs, buflen) {
    var outp = new Float32Array(2);

    // return a buffer of silence if not playing
    if (mod.paused || mod.endofsong || !mod.playing) {
        for (var s = 0; s < buflen; s++) {
            bufs[0][s] = 0.0;
            bufs[1][s] = 0.0;
            for (var ch = 0; ch < mod.chvu.length; ch++) mod.chvu[ch] = 0.0;
        }
        return;
    }

    // fill audiobuffer
    for (var s = 0; s < buflen; s++) {
        outp[0] = 0.0;
        outp[1] = 0.0;

        // if STT has run out, step player forward by tick
        if (mod.stt <= 0) mod.process_tick(mod);

        // mix channels
        for (var ch = 0; ch < mod.channels; ch++) {
            var fl = 0.0, fr = 0.0, fs = 0.0;
            var i = mod.channel[ch].instrument;
            var si = mod.channel[ch].sampleindex;

            // add channel output to left/right master outputs
            if (mod.channel[ch].noteon ||
                ((mod.instrument[i].voltype & 1) && !mod.channel[ch].noteon && mod.channel[ch].fadeoutpos) ||
                (!mod.channel[ch].noteon && mod.channel[ch].volramp < 1.0)
            ) {
                if (mod.instrument[i].sample[si].length > mod.channel[ch].samplepos) {
                    fl = mod.channel[ch].lastsample;

                    // interpolate towards current sample
                    var f = Math.floor(mod.channel[ch].samplepos);
                    fs = mod.instrument[i].sample[si].data[f];
                    f = mod.channel[ch].samplepos - f;
                    f = (mod.channel[ch].playdir < 0) ? (1.0 - f) : f;
                    fl = f * fs + (1.0 - f) * fl;

                    // smooth out discontinuities from retrig and sample offset
                    f = mod.channel[ch].trigramp;
                    fl = f * fl + (1.0 - f) * mod.channel[ch].trigrampfrom;
                    f += 1.0 / 128.0;
                    mod.channel[ch].trigramp = Math.min(1.0, f);
                    mod.channel[ch].currentsample = fl;

                    // ramp volume changes over 64 samples to avoid clicks
                    fr = fl * (mod.channel[ch].finalvolume / 64.0);
                    f = mod.channel[ch].volramp;
                    fl = f * fr + (1.0 - f) * (fl * (mod.channel[ch].volrampfrom / 64.0));
                    f += (1.0 / 64.0);
                    mod.channel[ch].volramp = Math.min(1.0, f);

                    // pan samples, if envelope is disabled panvenv is always 0.5
                    f = mod.finalpan[ch];
                    fr = fl * f;
                    fl *= 1.0 - f;
                }
                outp[0] += fl;
                outp[1] += fr;

                // advance sample position and check for loop or end
                var oldpos = mod.channel[ch].samplepos;
                mod.channel[ch].samplepos += mod.channel[ch].playdir * mod.channel[ch].samplespeed;
                if (mod.channel[ch].playdir == 1) {
                    if (Math.floor(mod.channel[ch].samplepos) > Math.floor(oldpos)) mod.channel[ch].lastsample = fs;
                } else {
                    if (Math.floor(mod.channel[ch].samplepos) < Math.floor(oldpos)) mod.channel[ch].lastsample = fs;
                }

                if (mod.instrument[i].sample[si].looptype) {
                    if (mod.instrument[i].sample[si].looptype == 2) {
                        // pingpong loop
                        if (mod.channel[ch].playdir == -1) {
                            // bounce off from start?
                            if (mod.channel[ch].samplepos <= mod.instrument[i].sample[si].loopstart) {
                                mod.channel[ch].samplepos += (mod.instrument[i].sample[si].loopstart - mod.channel[ch].samplepos);
                                mod.channel[ch].playdir = 1;
                                mod.channel[ch].lastsample = mod.channel[ch].currentsample;
                            }
                        } else {
                            // bounce off from end?
                            if (mod.channel[ch].samplepos >= mod.instrument[i].sample[si].loopend) {
                                mod.channel[ch].samplepos -= (mod.channel[ch].samplepos - mod.instrument[i].sample[si].loopend);
                                mod.channel[ch].playdir = -1;
                                mod.channel[ch].lastsample = mod.channel[ch].currentsample;
                            }
                        }
                    } else {
                        // normal loop
                        if (mod.channel[ch].samplepos >= mod.instrument[i].sample[si].loopend) {
                            mod.channel[ch].samplepos -= mod.instrument[i].sample[si].looplength;
                            mod.channel[ch].lastsample = mod.channel[ch].currentsample;
                        }
                    }
                } else {
                    if (mod.channel[ch].samplepos >= mod.instrument[i].sample[si].length) {
                        mod.channel[ch].noteon = 0;
                    }
                }
            } else {
                mod.channel[ch].currentsample = 0.0; // note is completely off
            }
            mod.chvu[ch] = Math.max(mod.chvu[ch], Math.abs(fl + fr));
        }

        // done - store to output buffer
        const t = mod.volume / 64.0;
        bufs[0][s] = outp[0] * t;
        bufs[1][s] = outp[1] * t
        mod.stt--;
    }
}



//
// volume column effect functions
//
Fasttracker.prototype.effect_vol_t0_60 = function (mod, ch, data) { // 60-6f vol slide down
}
Fasttracker.prototype.effect_vol_t0_70 = function (mod, ch, data) { // 70-7f vol slide up
}
Fasttracker.prototype.effect_vol_t0_80 = function (mod, ch, data) { // 80-8f fine vol slide down
    mod.channel[ch].voicevolume -= data;
    if (mod.channel[ch].voicevolume < 0) mod.channel[ch].voicevolume = 0;
}
Fasttracker.prototype.effect_vol_t0_90 = function (mod, ch, data) { // 90-9f fine vol slide up
    mod.channel[ch].voicevolume += data;
    if (mod.channel[ch].voicevolume > 64) mod.channel[ch].voicevolume = 64;
}
Fasttracker.prototype.effect_vol_t0_a0 = function (mod, ch, data) { // a0-af set vibrato speed
    mod.channel[ch].vibratospeed = data;
}
Fasttracker.prototype.effect_vol_t0_b0 = function (mod, ch, data) { // b0-bf vibrato
    if (data) mod.channel[ch].vibratodepth = data;
    mod.effect_t1_4(mod, ch);
}
Fasttracker.prototype.effect_vol_t0_c0 = function (mod, ch, data) { // c0-cf set panning
    mod.pan[ch] = (data & 0x0f) / 15.0;
}
Fasttracker.prototype.effect_vol_t0_d0 = function (mod, ch, data) { // d0-df panning slide left
}
Fasttracker.prototype.effect_vol_t0_e0 = function (mod, ch, data) { // e0-ef panning slide right
}
Fasttracker.prototype.effect_vol_t0_f0 = function (mod, ch, data) { // f0-ff tone porta
    //  if (data) mod.channel[ch].slidetospeed=data;
    //  if (!mod.amigaperiods) mod.channel[ch].slidetospeed*=4;
}
//////
Fasttracker.prototype.effect_vol_t1_60 = function (mod, ch, data) { // 60-6f vol slide down
    mod.channel[ch].voicevolume -= data;
    if (mod.channel[ch].voicevolume < 0) mod.channel[ch].voicevolume = 0;
}
Fasttracker.prototype.effect_vol_t1_70 = function (mod, ch, data) { // 70-7f vol slide up
    mod.channel[ch].voicevolume += data;
    if (mod.channel[ch].voicevolume > 64) mod.channel[ch].voicevolume = 64;
}
Fasttracker.prototype.effect_vol_t1_80 = function (mod, ch, data) { // 80-8f fine vol slide down
}
Fasttracker.prototype.effect_vol_t1_90 = function (mod, ch, data) { // 90-9f fine vol slide up
}
Fasttracker.prototype.effect_vol_t1_a0 = function (mod, ch, data) { // a0-af set vibrato speed
}
Fasttracker.prototype.effect_vol_t1_b0 = function (mod, ch, data) { // b0-bf vibrato
    mod.effect_t1_4(mod, ch); // same as effect column vibrato on ticks 1+
}
Fasttracker.prototype.effect_vol_t1_c0 = function (mod, ch, data) { // c0-cf set panning
}
Fasttracker.prototype.effect_vol_t1_d0 = function (mod, ch, data) { // d0-df panning slide left
}
Fasttracker.prototype.effect_vol_t1_e0 = function (mod, ch, data) { // e0-ef panning slide right
}
Fasttracker.prototype.effect_vol_t1_f0 = function (mod, ch, data) { // f0-ff tone porta
    //  mod.effect_t1_3(mod, ch);
}



//
// tick 0 effect functions
//
Fasttracker.prototype.effect_t0_0 = function (mod, ch) { // 0 arpeggio
    mod.channel[ch].arpeggio = mod.channel[ch].data;
}
Fasttracker.prototype.effect_t0_1 = function (mod, ch) { // 1 slide up
    if (mod.channel[ch].data) mod.channel[ch].slideupspeed = mod.channel[ch].data * 4;
}
Fasttracker.prototype.effect_t0_2 = function (mod, ch) { // 2 slide down
    if (mod.channel[ch].data) mod.channel[ch].slidedownspeed = mod.channel[ch].data * 4;
}
Fasttracker.prototype.effect_t0_3 = function (mod, ch) { // 3 slide to note
    if (mod.channel[ch].data) mod.channel[ch].slidetospeed = mod.channel[ch].data * 4;
}
Fasttracker.prototype.effect_t0_4 = function (mod, ch) { // 4 vibrato
    if (mod.channel[ch].data & 0x0f && mod.channel[ch].data & 0xf0) {
        mod.channel[ch].vibratodepth = (mod.channel[ch].data & 0x0f);
        mod.channel[ch].vibratospeed = (mod.channel[ch].data & 0xf0) >> 4;
    }
    mod.effect_t1_4(mod, ch);
}
Fasttracker.prototype.effect_t0_5 = function (mod, ch) { // 5
    mod.effect_t0_a(mod, ch);
}
Fasttracker.prototype.effect_t0_6 = function (mod, ch) { // 6
    mod.effect_t0_a(mod, ch);
}
Fasttracker.prototype.effect_t0_7 = function (mod, ch) { // 7
}
Fasttracker.prototype.effect_t0_8 = function (mod, ch) { // 8 set panning
    mod.pan[ch] = mod.channel[ch].data / 255.0;
}
Fasttracker.prototype.effect_t0_9 = function (mod, ch) { // 9 set sample offset
    mod.channel[ch].samplepos = mod.channel[ch].data * 256;
    mod.channel[ch].playdir = 1;

    mod.channel[ch].trigramp = 0.0;
    mod.channel[ch].trigrampfrom = mod.channel[ch].currentsample;
}
Fasttracker.prototype.effect_t0_a = function (mod, ch) { // a volume slide
    // this behavior differs from protracker!! A00 will slide using previous non-zero parameter.
    if (mod.channel[ch].data) mod.channel[ch].volslide = mod.channel[ch].data;
}
Fasttracker.prototype.effect_t0_b = function (mod, ch) { // b pattern jump
    mod.breakrow = 0;
    mod.patternjump = mod.channel[ch].data;
    mod.flags |= 16;
}
Fasttracker.prototype.effect_t0_c = function (mod, ch) { // c set volume
    mod.channel[ch].voicevolume = mod.channel[ch].data;
    if (mod.channel[ch].voicevolume < 0) mod.channel[ch].voicevolume = 0;
    if (mod.channel[ch].voicevolume > 64) mod.channel[ch].voicevolume = 64;
}
Fasttracker.prototype.effect_t0_d = function (mod, ch) { // d pattern break
    mod.breakrow = ((mod.channel[ch].data & 0xf0) >> 4) * 10 + (mod.channel[ch].data & 0x0f);
    if (!(mod.flags & 16)) mod.patternjump = mod.position + 1;
    mod.flags |= 16;
}
Fasttracker.prototype.effect_t0_e = function (mod, ch) { // e
    var i = (mod.channel[ch].data & 0xf0) >> 4;
    mod.effects_t0_e[i](mod, ch);
}
Fasttracker.prototype.effect_t0_f = function (mod, ch) { // f set speed
    if (mod.channel[ch].data > 32) {
        mod.bpm = mod.channel[ch].data;
    } else {
        if (mod.channel[ch].data) mod.speed = mod.channel[ch].data;
    }
}
Fasttracker.prototype.effect_t0_g = function (mod, ch) { // g set global volume
    if (mod.channel[ch].data <= 0x40) mod.volume = mod.channel[ch].data;
}
Fasttracker.prototype.effect_t0_h = function (mod, ch) { // h global volume slide
    if (mod.channel[ch].data) mod.globalvolslide = mod.channel[ch].data;
}
Fasttracker.prototype.effect_t0_i = function (mod, ch) { // i
}
Fasttracker.prototype.effect_t0_j = function (mod, ch) { // j
}
Fasttracker.prototype.effect_t0_k = function (mod, ch) { // k key off
    mod.channel[ch].noteon = 0;
    if (!(mod.instrument[mod.channel[ch].instrument].voltype & 1)) mod.channel[ch].voicevolume = 0;
}
Fasttracker.prototype.effect_t0_l = function (mod, ch) { // l set envelope position
    mod.channel[ch].volenvpos = mod.channel[ch].data;
    mod.channel[ch].panenvpos = mod.channel[ch].data;
}
Fasttracker.prototype.effect_t0_m = function (mod, ch) { // m
}
Fasttracker.prototype.effect_t0_n = function (mod, ch) { // n
}
Fasttracker.prototype.effect_t0_o = function (mod, ch) { // o
}
Fasttracker.prototype.effect_t0_p = function (mod, ch) { // p panning slide
}
Fasttracker.prototype.effect_t0_q = function (mod, ch) { // q
}
Fasttracker.prototype.effect_t0_r = function (mod, ch) { // r multi retrig note
}
Fasttracker.prototype.effect_t0_s = function (mod, ch) { // s
}
Fasttracker.prototype.effect_t0_t = function (mod, ch) { // t tremor
}
Fasttracker.prototype.effect_t0_u = function (mod, ch) { // u
}
Fasttracker.prototype.effect_t0_v = function (mod, ch) { // v
}
Fasttracker.prototype.effect_t0_w = function (mod, ch) { // w
}
Fasttracker.prototype.effect_t0_x = function (mod, ch) { // x extra fine porta up/down
}
Fasttracker.prototype.effect_t0_y = function (mod, ch) { // y
}
Fasttracker.prototype.effect_t0_z = function (mod, ch) { // z
}



//
// tick 0 effect e functions
//
Fasttracker.prototype.effect_t0_e0 = function (mod, ch) { // e0 filter on/off
}
Fasttracker.prototype.effect_t0_e1 = function (mod, ch) { // e1 fine slide up
    mod.channel[ch].period -= mod.channel[ch].data & 0x0f;
    if (mod.channel[ch].period < 113) mod.channel[ch].period = 113;
}
Fasttracker.prototype.effect_t0_e2 = function (mod, ch) { // e2 fine slide down
    mod.channel[ch].period += mod.channel[ch].data & 0x0f;
    if (mod.channel[ch].period > 856) mod.channel[ch].period = 856;
    mod.channel[ch].flags |= 1;
}
Fasttracker.prototype.effect_t0_e3 = function (mod, ch) { // e3 set glissando
}
Fasttracker.prototype.effect_t0_e4 = function (mod, ch) { // e4 set vibrato waveform
    mod.channel[ch].vibratowave = mod.channel[ch].data & 0x07;
}
Fasttracker.prototype.effect_t0_e5 = function (mod, ch) { // e5 set finetune
}
Fasttracker.prototype.effect_t0_e6 = function (mod, ch) { // e6 loop pattern
    if (mod.channel[ch].data & 0x0f) {
        if (mod.loopcount) {
            mod.loopcount--;
        } else {
            mod.loopcount = mod.channel[ch].data & 0x0f;
        }
        if (mod.loopcount) mod.flags |= 64;
    } else {
        mod.looprow = mod.row;
    }
}
Fasttracker.prototype.effect_t0_e7 = function (mod, ch) { // e7
}
Fasttracker.prototype.effect_t0_e8 = function (mod, ch) { // e8, use for syncing
    mod.syncqueue.unshift(mod.channel[ch].data & 0x0f);
}
Fasttracker.prototype.effect_t0_e9 = function (mod, ch) { // e9
}
Fasttracker.prototype.effect_t0_ea = function (mod, ch) { // ea fine volslide up
    mod.channel[ch].voicevolume += mod.channel[ch].data & 0x0f;
    if (mod.channel[ch].voicevolume > 64) mod.channel[ch].voicevolume = 64;
}
Fasttracker.prototype.effect_t0_eb = function (mod, ch) { // eb fine volslide down
    mod.channel[ch].voicevolume -= mod.channel[ch].data & 0x0f;
    if (mod.channel[ch].voicevolume < 0) mod.channel[ch].voicevolume = 0;
}
Fasttracker.prototype.effect_t0_ec = function (mod, ch) { // ec
}
Fasttracker.prototype.effect_t0_ed = function (mod, ch) { // ed delay sample
    if (mod.tick == (mod.channel[ch].data & 0x0f)) {
        mod.process_note(mod, mod.patterntable[mod.position], ch);
    }
}
Fasttracker.prototype.effect_t0_ee = function (mod, ch) { // ee delay pattern
    mod.patterndelay = mod.channel[ch].data & 0x0f;
    mod.patternwait = 0;
}
Fasttracker.prototype.effect_t0_ef = function (mod, ch) { // ef
}



//
// tick 1+ effect functions
//
Fasttracker.prototype.effect_t1_0 = function (mod, ch) { // 0 arpeggio
    if (mod.channel[ch].data) {
        var i = mod.channel[ch].instrument;
        var apn = mod.channel[ch].note;
        if ((mod.tick % 3) == 1) apn += mod.channel[ch].arpeggio >> 4;
        if ((mod.tick % 3) == 2) apn += mod.channel[ch].arpeggio & 0x0f;

        var s = mod.channel[ch].sampleindex;
        mod.channel[ch].voiceperiod = mod.calcperiod(mod, apn + mod.instrument[i].sample[s].relativenote, mod.instrument[i].sample[s].finetune);
        mod.channel[ch].flags |= 1;
    }
}
Fasttracker.prototype.effect_t1_1 = function (mod, ch) { // 1 slide up
    mod.channel[ch].voiceperiod -= mod.channel[ch].slideupspeed;
    if (mod.channel[ch].voiceperiod < 1) mod.channel[ch].voiceperiod += 65535; // yeah, this is how it supposedly works in ft2...
    mod.channel[ch].flags |= 3; // recalc speed
}
Fasttracker.prototype.effect_t1_2 = function (mod, ch) { // 2 slide down
    mod.channel[ch].voiceperiod += mod.channel[ch].slidedownspeed;
    if (mod.channel[ch].voiceperiod > 7680) mod.channel[ch].voiceperiod = 7680;
    mod.channel[ch].flags |= 3; // recalc speed
}
Fasttracker.prototype.effect_t1_3 = function (mod, ch) { // 3 slide to note
    if (mod.channel[ch].voiceperiod < mod.channel[ch].slideto) {
        mod.channel[ch].voiceperiod += mod.channel[ch].slidetospeed;
        if (mod.channel[ch].voiceperiod > mod.channel[ch].slideto)
            mod.channel[ch].voiceperiod = mod.channel[ch].slideto;
    }
    if (mod.channel[ch].voiceperiod > mod.channel[ch].slideto) {
        mod.channel[ch].voiceperiod -= mod.channel[ch].slidetospeed;
        if (mod.channel[ch].voiceperiod < mod.channel[ch].slideto)
            mod.channel[ch].voiceperiod = mod.channel[ch].slideto;
    }
    mod.channel[ch].flags |= 3; // recalc speed
}
Fasttracker.prototype.effect_t1_4 = function (mod, ch) { // 4 vibrato
    var waveform = mod.vibratotable[mod.channel[ch].vibratowave & 3][mod.channel[ch].vibratopos] / 63.0;
    var a = mod.channel[ch].vibratodepth * waveform;
    mod.channel[ch].voiceperiod += a;
    mod.channel[ch].flags |= 1;
}
Fasttracker.prototype.effect_t1_5 = function (mod, ch) { // 5 volslide + slide to note
    mod.effect_t1_3(mod, ch); // slide to note
    mod.effect_t1_a(mod, ch); // volslide
}
Fasttracker.prototype.effect_t1_6 = function (mod, ch) { // 6 volslide + vibrato
    mod.effect_t1_4(mod, ch); // vibrato
    mod.effect_t1_a(mod, ch); // volslide
}
Fasttracker.prototype.effect_t1_7 = function (mod, ch) { // 7
}
Fasttracker.prototype.effect_t1_8 = function (mod, ch) { // 8 unused
}
Fasttracker.prototype.effect_t1_9 = function (mod, ch) { // 9 set sample offset
}
Fasttracker.prototype.effect_t1_a = function (mod, ch) { // a volume slide
    if (!(mod.channel[ch].volslide & 0x0f)) {
        // y is zero, slide up
        mod.channel[ch].voicevolume += (mod.channel[ch].volslide >> 4);
        if (mod.channel[ch].voicevolume > 64) mod.channel[ch].voicevolume = 64;
    }
    if (!(mod.channel[ch].volslide & 0xf0)) {
        // x is zero, slide down
        mod.channel[ch].voicevolume -= (mod.channel[ch].volslide & 0x0f);
        if (mod.channel[ch].voicevolume < 0) mod.channel[ch].voicevolume = 0;
    }
}
Fasttracker.prototype.effect_t1_b = function (mod, ch) { // b pattern jump
}
Fasttracker.prototype.effect_t1_c = function (mod, ch) { // c set volume
}
Fasttracker.prototype.effect_t1_d = function (mod, ch) { // d pattern break
}
Fasttracker.prototype.effect_t1_e = function (mod, ch) { // e
    var i = (mod.channel[ch].data & 0xf0) >> 4;
    mod.effects_t1_e[i](mod, ch);
}
Fasttracker.prototype.effect_t1_f = function (mod, ch) { // f
}
Fasttracker.prototype.effect_t1_g = function (mod, ch) { // g set global volume
}
Fasttracker.prototype.effect_t1_h = function (mod, ch) { // h global volume slude
    if (!(mod.globalvolslide & 0x0f)) {
        // y is zero, slide up
        mod.volume += (mod.globalvolslide >> 4);
        if (mod.volume > 64) mod.volume = 64;
    }
    if (!(mod.globalvolslide & 0xf0)) {
        // x is zero, slide down
        mod.volume -= (mod.globalvolslide & 0x0f);
        if (mod.volume < 0) mod.volume = 0;
    }
}
Fasttracker.prototype.effect_t1_i = function (mod, ch) { // i
}
Fasttracker.prototype.effect_t1_j = function (mod, ch) { // j
}
Fasttracker.prototype.effect_t1_k = function (mod, ch) { // k key off
}
Fasttracker.prototype.effect_t1_l = function (mod, ch) { // l set envelope position
}
Fasttracker.prototype.effect_t1_m = function (mod, ch) { // m
}
Fasttracker.prototype.effect_t1_n = function (mod, ch) { // n
}
Fasttracker.prototype.effect_t1_o = function (mod, ch) { // o
}
Fasttracker.prototype.effect_t1_p = function (mod, ch) { // p panning slide
}
Fasttracker.prototype.effect_t1_q = function (mod, ch) { // q
}
Fasttracker.prototype.effect_t1_r = function (mod, ch) { // r multi retrig note
}
Fasttracker.prototype.effect_t1_s = function (mod, ch) { // s
}
Fasttracker.prototype.effect_t1_t = function (mod, ch) { // t tremor
}
Fasttracker.prototype.effect_t1_u = function (mod, ch) { // u
}
Fasttracker.prototype.effect_t1_v = function (mod, ch) { // v
}
Fasttracker.prototype.effect_t1_w = function (mod, ch) { // w
}
Fasttracker.prototype.effect_t1_x = function (mod, ch) { // x extra fine porta up/down
}
Fasttracker.prototype.effect_t1_y = function (mod, ch) { // y
}
Fasttracker.prototype.effect_t1_z = function (mod, ch) { // z
}



//
// tick 1+ effect e functions
//
Fasttracker.prototype.effect_t1_e0 = function (mod, ch) { // e0
}
Fasttracker.prototype.effect_t1_e1 = function (mod, ch) { // e1
}
Fasttracker.prototype.effect_t1_e2 = function (mod, ch) { // e2
}
Fasttracker.prototype.effect_t1_e3 = function (mod, ch) { // e3
}
Fasttracker.prototype.effect_t1_e4 = function (mod, ch) { // e4
}
Fasttracker.prototype.effect_t1_e5 = function (mod, ch) { // e5
}
Fasttracker.prototype.effect_t1_e6 = function (mod, ch) { // e6
}
Fasttracker.prototype.effect_t1_e7 = function (mod, ch) { // e7
}
Fasttracker.prototype.effect_t1_e8 = function (mod, ch) { // e8
}
Fasttracker.prototype.effect_t1_e9 = function (mod, ch) { // e9 retrig sample
    if (mod.tick % (mod.channel[ch].data & 0x0f) == 0) {
        mod.channel[ch].samplepos = 0;
        mod.channel[ch].playdir = 1;

        mod.channel[ch].trigramp = 0.0;
        mod.channel[ch].trigrampfrom = mod.channel[ch].currentsample;

        mod.channel[ch].fadeoutpos = 65535;
        mod.channel[ch].volenvpos = 0;
        mod.channel[ch].panenvpos = 0;
    }
}
Fasttracker.prototype.effect_t1_ea = function (mod, ch) { // ea
}
Fasttracker.prototype.effect_t1_eb = function (mod, ch) { // eb
}
Fasttracker.prototype.effect_t1_ec = function (mod, ch) { // ec cut sample
    if (mod.tick == (mod.channel[ch].data & 0x0f))
        mod.channel[ch].voicevolume = 0;
}
Fasttracker.prototype.effect_t1_ed = function (mod, ch) { // ed delay sample
    mod.effect_t0_ed(mod, ch);
}
Fasttracker.prototype.effect_t1_ee = function (mod, ch) { // ee
}
Fasttracker.prototype.effect_t1_ef = function (mod, ch) { // ef
}



class FT2WorkletProcessor extends AudioWorkletProcessor {

    sampleRate = 44100;
    filename = '';
    player;
    isSongReady = false;
    mixval = 8.0;
    chvu = new Float32Array(32);

    // container for song infos like: name, author, etc
    songInfo = {};

    constructor() {
        super();

        this.player = new Fasttracker();
        this.format = 'xm'
        this.mixingBufferSize = Math.floor(this.sampleRate / 50);
        this.mixingBufferL = new Array(this.mixingBufferSize);
        this.mixingBufferR = new Array(this.mixingBufferSize);

        // onmessage binding
        this.port.onmessage = this.onmessage.bind(this);
    }

    onmessage(e) {
        const { data } = e;
        console.log('onmessage ' + data.type)
        switch (data.type) {

            case 'loadMusicData':
                this.isSongReady = this.loadMusicData(data.sampleRate, data.path, data.filename, data.data, data.options)
                break;

            case 'play':
                this.isPaused = false;
                this.endofsong = false;
                this.player.endofsong = false;
                this.player.paused = false;
                this.player.initialize();
                this.player.flags = 1 + 2;
                this.player.playing = true;
                this.playing = true;

                this.chvu = new Float32Array(this.player.channels);
                for (let i = 0; i < this.player.channels; i++) this.chvu[i] = 0.0;
                break;

            case 'pause':
                this.isPaused = true;
                break;
        }
    }

    loadMusicData(sampleRate, path, filename, data, options) {
        this.filename = filename
        this.player.clearsong();
        if (this.player.parse(data)) {
            // copy static data from player
            this.songInfo = {
                'title': this.player.title,
                'signature': this.player.signature,
                'songlen': this.player.songlen,
                'channels': this.player.channels,
                'patterns': this.player.patterns,
                'filter': this.player.filter,
                'mixval': this.player.mixval // usually 8.0, though
            }

            const samplenames = new Array(32)
            for (let i = 0; i < 32; i++)
                samplenames[i] = "";

            if (this.format == 'xm' || this.format == 'it') {
                for (let i = 0; i < this.player.instrument.length; i++) samplenames[i] = this.player.instrument[i].name;
            } else {
                for (let i = 0; i < this.player.sample.length; i++) samplenames[i] = this.player.sample[i].name;
            }
            this.songInfo['samplenames'] = samplenames

            this.isSongReady = true
            this.loading = false;



        }

        return true
    }

    process(inputs, outputs) {

        const outputL = outputs[0][0];
        const outputR = outputs[0][1];

        let framesToRender = outputL.length;
        var bufs = new Array(outputL, outputR);

        if ((!this.isSongReady) || this.isPaused) {

            for (let i = 0; i < framesToRender; i++) {
                outputL[i] = 0;
                outputR[i] = 0;
            }

        } else {
            //this.player.repeat = this.repeat;
            this.player.mix(this.player, bufs, framesToRender);


            // apply stereo separation and soft clipping
            var outp = new Float32Array(2);
            for (var s = 0; s < framesToRender; s++) {
                outp[0] = bufs[0][s];
                outp[1] = bufs[1][s];

                // a more headphone-friendly stereo separation
                // if (this.separation) {
                //     t = outp[0];
                //     if (this.separation == 2) { // mono
                //         outp[0] = outp[0] * 0.5 + outp[1] * 0.5;
                //         outp[1] = outp[1] * 0.5 + t * 0.5;
                //     } else { // narrow stereo
                //         outp[0] = outp[0] * 0.65 + outp[1] * 0.35;
                //         outp[1] = outp[1] * 0.65 + t * 0.35;
                //     }
                // }

                // scale down and soft clip
                outp[0] /= this.mixval; outp[0] = 0.5 * (Math.abs(outp[0] + 0.975) - Math.abs(outp[0] - 0.975));
                outp[1] /= this.mixval; outp[1] = 0.5 * (Math.abs(outp[1] + 0.975) - Math.abs(outp[1] - 0.975));

                bufs[0][s] = outp[0];
                bufs[1][s] = outp[1];
            }

            this.row = this.player.row;
            this.position = this.player.position;
            this.speed = this.player.speed;
            this.bpm = this.player.bpm;
            this.endofsong = this.player.endofsong;

            //if (this.player.filter != this.filter) {
            //    this.setfilter(this.player.filter);
            //}

            if (this.endofsong && this.playing) {
                this.isPaused = true;  // stop playback (or this will retrigger again and again before new song is started)
                this.port.postMessage({
                    type: 'onTrackEnd'
                });
            }

            if (this.delayfirst > 0) this.delayfirst--;
            this.delayload = 0;

            // update this.chvu from player channel vu
            for (var i = 0; i < this.player.channels; i++) {
                this.chvu[i] = this.chvu[i] * 0.25 + this.player.chvu[i] * 0.75;
                this.player.chvu[i] = 0.0;
            }

        }

        return true
    }

}


registerProcessor('ft2-worklet-processor', FT2WorkletProcessor);
