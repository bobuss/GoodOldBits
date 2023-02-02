# Nostalgic music jukebox

![Good Old Bits](screen.png)

https://player.tornil.me/



## Features
- Modern WebAudio Module player, uses [AudioWorklets](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet).

- Have a look to the list of [supported formats](src/README.md).

- Supports the following backends:
  - [libopnmpt](https://lib.openmpt.org/libopenmpt/) worklet processor (version 0.6.7, 2023-01-08)
    - emscripten worklet-compatible module... built manually. Will push that on a repository, on day
  - [sc68](http://sc68.atari.org/index.html) worklet processor
    - emscripten worklet-compatible module from https://github.com/bobuss/sc68-2.2.1
    - adapted from [Juergen Wothke webAudio86](https://bitbucket.org/wothke/sc68-2.2.1/src/master/).
  - FastTracker2, Screamtracker3 and Protracker adapted from [webaudio-mod-player](https://github.com/electronoora/webaudio-mod-player)

- It plays files served locally or served from internet, currently supports [modland](https://modland.com/).


## Resources and Inspirations

- design from https://codepen.io/alowenthal/pen/rxboRv
- icons from https://fonts.google.com/icons
- player from Juergen Wothke https://bitbucket.org/wothke/webaudio-player
  - sc68 backend: https://bitbucket.org/wothke/sc68-2.2.1/src/master/
  - ym backend: https://bitbucket.org/wothke/webym/src/master/
  - xmp backend: https://bitbucket.org/wothke/libxmp-4.4.1/src/master/
- ym player by https://github.com/nguillaumin/ym-jukebox
- sc68 replay bin files from https://github.com/DeaDBeeF-Player/deadbeef build
- YM resources https://github.com/simondotm/ym2149f/blob/master/doc/Resources.md
- sndh collection from http://sndh.atari.org/
- sc68 collection from http://sc68.atari.org/
- checked out https://github.com/demozoo/cowbell, but does not support multi-track songs
- https://github.com/bryc/ahx-web-player

Big up to Nectarine web radio: https://scenestream.net/demovibes/streams/



## TODO
- fixed width for player
- work on onTrackEnd functions. Often stuck with sc68 backend...
- more visible queue icon, maybe with visible info from the player
- seek bar for formats which support it
