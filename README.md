# Atari music jukebox

https://player.tornil.me/


## Resources

- design from https://codepen.io/alowenthal/pen/rxboRv
- icons from https://fonts.google.com/icons
- player from Juergen Wothke https://bitbucket.org/wothke/webaudio-player
  - sc68 backend: https://bitbucket.org/wothke/sc68-2.2.1/src/master/
  - ym backend: https://bitbucket.org/wothke/webym/src/master/
- ym player by https://github.com/nguillaumin/ym-jukebox
- sc68 replay bin files from https://github.com/DeaDBeeF-Player/deadbeef build
- YM resources https://github.com/simondotm/ym2149f/blob/master/doc/Resources.md
- sndh collection from http://sndh.atari.org/
- sc68 collection from http://sc68.atari.org/


## Building the ST-Sound library Emscripten port

```
docker run --rm -v $PWD/stsound:/data -w /data emscripten/emsdk:latest emmake make clean libym.js
```



## TODO
- routing
- playlists
- select format
- seek for formats that support it
- more formats
