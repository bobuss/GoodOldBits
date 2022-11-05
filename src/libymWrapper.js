// initially from https://github.com/nguillaumin/ym-jukebox
//
// adjusted exported methods
//

import axios from 'axios'
import libymModule from '../stsound/libym'

var libym

libymModule().then(( instance ) => {
  libym = instance
})

// Chrome requires a user interaction to create an audio context, so
// only create it when we play a song
var audioCtx
var scriptNode

var state = {
  paused: false,
  ym: 0,
  musicDataPtr: 0,
  samplesDataPtr: 0,
  songInfo: {
    numberOfTracks: 1
  }
}

var onSongEnded = () => {}

function extractString(heap, start) {
  var str = [];
  for (var i=start; heap[i] !==0; i++) {
      str.push(String.fromCharCode(heap[i]));
  }

  return str.join('');
}

function cleanup (state) {
  state.paused = false

  if (state.musicDataPtr > 0) {
    libym._free(state.musicDataPtr)
    state.musicDataPtr = 0
  }

  if (state.samplesDataPtr > 0) {
    libym._free(state.samplesDataPtr)
    state.samplesDataPtr = 0
  }

  if (state.ym > 0) {
    libym.ccall('ymMusicDestroy',
      'number',
      ['number'],
      [state.ym])

    state.ym = 0
  }

  scriptNode.onaudioprocess = (e) => {}
  try {
    scriptNode.disconnect(audioCtx.destination)
  } catch (e) {
  }
}

function getLibYmLastError (ym) {
  return libym.ccall('ymMusicGetLastError',
    'string',
    ['number'],
    [ym])
}

function loadMusicFromURL(url, options, onCompletion, onFail, onProgress) {
  playSong(url, onCompletion)
}

function playSong (path, onCompletion) {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    scriptNode = audioCtx.createScriptProcessor(8192, 0, 1)
  }

  axios.get(path.replace(/#/, '%23'), {
    responseType: 'arraybuffer'
  })
    .then(response => {
      // Cleanup previous state. May happen if a new
      // song starts playing while a song is currently playing
      cleanup(state)

      state.ym = libym.ccall('ymMusicCreate', 'number')

      var musicData = new Uint8Array(response.data)
      state.musicDataPtr = libym._malloc(musicData.byteLength)

      libym.HEAPU8.set(musicData, state.musicDataPtr)

      if (libym.ccall('ymMusicLoadMemory',
        'number',
        ['number', 'number', 'number'],
        [state.ym, state.musicDataPtr, musicData.byteLength]) === 0) {

        console.error('Error loading music from memory', getLibYmLastError(state.ym))
        return

      }

      var samplesData = new Int16Array(scriptNode.bufferSize)
      state.samplesDataPtr = libym._malloc(samplesData.byteLength)

      scriptNode.onaudioprocess = (e) => {
        if (state.paused) {
          return
        }

        if (libym.ccall('ymMusicCompute',
          'number',
          ['number', 'number', 'number'],
          [state.ym, state.samplesDataPtr, samplesData.length]) === 0) {

          // Most likely the tune ended
          cleanup(state)

          onSongEnded()
          return
        }

        var result = new Int16Array(libym.HEAP16.buffer, state.samplesDataPtr, samplesData.length)
        var outputData = e.outputBuffer.getChannelData(0)

        for (var i = 0; i < samplesData.length; i++) {
          outputData[i] = result[i] / (result[i] >= 0 ? 32767 : 32768)
        }
      }

      scriptNode.connect(audioCtx.destination)

      onCompletion(path)

    })
}

function pause () {
  state.paused = true
  scriptNode.disconnect(audioCtx.destination)
}

function resume () {
  state.paused = false
  scriptNode.connect(audioCtx.destination)
}

function getSongInfo (path) {
  // populate songInfo
  // The ymMusicInfo_t struct is 28 bytes long
  var infoPtr = libym._malloc(28);

  libym.ccall('ymMusicGetInfo',
      '',
      ['number', 'number'],
      [state.ym, infoPtr]);

  var defaultName = path

  var name = extractString(libym.HEAPU8, libym.getValue(infoPtr, '*'));
  if (name === '' || /unknown/i.test(name)) {
      name = defaultName;
  }

  state.songInfo = {
      name: name,
      author: extractString(libym.HEAPU8, libym.getValue(infoPtr+4, '*')) || '[n/a]',
      comment: extractString(libym.HEAPU8, libym.getValue(infoPtr+8, '*')),
      type: extractString(libym.HEAPU8, libym.getValue(infoPtr+12, '*')),
      player: extractString(libym.HEAPU8, libym.getValue(infoPtr+16, '*')),
      durationMs: libym.getValue(infoPtr+24, 'i32'),
      numberOfTracks: 1
  };
  libym._free(infoPtr);
  return state.songInfo
}

export default {
  loadMusicFromURL: loadMusicFromURL,
  pause: pause,
  resume: resume,
  getSongInfo: getSongInfo,
  setOnSongEnded (callback) {
    onSongEnded = callback
  }
}
