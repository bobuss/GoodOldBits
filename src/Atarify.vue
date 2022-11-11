<script>

const collections = {}

// import libymWrapper from './libymWrapper'
// import cowbellWrapper from './cowbellWrapper'

import sndh from './json/sndh.json';
collections['sndh'] = sndh

// import ym from './json/ym.json';
// collections['ym'] = ym

// import sc68 from './json/sc68.json';
// collections['sc68'] = sc68

// import xmp from './json/xmp.json';
// collections['xmp'] = xmp


export default {
  name: 'Atarify',
  data() {
    return {
      init: false,
      format: 'sndh',
      selectedComposer: '',
      player: null,
      playerComposer: null,
      playerSong: null,
      playerTrack: 0,
      tracker: 'Protracker',
      songInfo: { numberOfTracks: 1 },
      search: '',
      playing: false,
      playlist: [],
      hover: null,
      selectedSong: null,
      sbActive: false,
      sbVisible: false,
      vVisible: false
    }
  },
  computed: {

    facetedComposers() {
      const search = this.search.replaceAll(' ', '_').toLowerCase();

      const filteredSongs = this.flatSongs.filter(song => {
        return song.toLowerCase().includes(search)
      })

      const groupByComposer = filteredSongs.reduce((group, song) => {
        const category = song.split('/')[0]
        group[category] = group[category] ?? 0;
        group[category]++
        return group;
      }, {})

      return groupByComposer
    },

    filteredSongs() {
      return this.flatComposerSongs.filter(song => {
        return song.toLowerCase().includes(this.search.replaceAll(' ', '_').toLowerCase());
      }).map(song => song.substring(this.selectedComposer.length + 1) )
    },

    backendAdapter() {
      switch (this.format) {
        case 'ym':
          return YMBackendAdapter;
        case 'xmp':
          return XMPBackendAdapter;
        case 'sndh':
        case 'sc68':
          return SC68BackendAdapter;
          break;
      }
    },

    musics() {
      return collections[this.format]
    },

    playerPath() {
      return this.playerComposer + '/' + this.playerSong
    },

    musicPath() {
      switch (this.format) {
        case 'xmp':
          return 'http://modland.com/pub/modules/' + this.tracker + '/' + this.playerPath
          break;
        case 'sndh':
          return 'musics/sndh/' + this.playerPath
          break;
        case 'sc68':
          return 'musics/sc68/' + this.playerPath
          break;
        case 'ym':
          return 'musics/ym/' + this.playerPath
          break;
      }
    },

    flatComposerSongs() {
      const composerSongs = this.musics[this.selectedComposer] || [];
      return composerSongs.map(song => this.selectedComposer + '/' + song)
    },

    flatSongs() {
      return Object.keys(this.musics).reduce((acc, key) => {
        return acc.concat(this.musics[key].map(music => `${key}/${music}`))
      }, []);
    },

    listOfSongs() {
      return this.playlist.map(function (path) {
        var arr = path.split('/')
        return {
          'path': path,
          'composer': arr[0],
          'title': arr.slice(1).join('/')
        }
      })
    }

  },

  updated(){
    this.initDisplay();
  },

  mounted() {
    this.setupEvents();
    this.updateHeight();
    this.initDisplay();
  },

  created() {
    this.createPlayerInstance();
  },

  beforeDestroy() {
    this.player.pause();
    this.player = null;
  },

  methods: {

    createPlayerInstance() {

      switch (this.format) {
        // case 'ym':
        //   this.player = libymWrapper
        //   break;

        case 'xmp':
        case 'sndh':
        case 'sc68':
          const backendAdapter = this.backendAdapter;
          let self = this;

          ScriptNodePlayer.createInstance(
            new this.backendAdapter(),    // backendAdapter
            '',                           // basePath, not needed here
            [],                           // requiredFiles
            false,                        // enableSpectrum
            function() {},                // onPlayerReady
            function() {},                // onTrackReadyToPlay
            function() {                  // onTrackEnd
              // strange hack here, but it works: repeat current track
              console.log('doOnTrackEnd')
              self.play(self.playerPath, self.playerTrack++);
            },
            function() {}                 // doOnUpdate
          );
          this.player = ScriptNodePlayer.getInstance()
          break;
        // case 'xmp':
        case 'ym':
           this.player = cowbellWrapper
           break;
      }

    },

    onSelectComposer(composer) {
      this.togglePlaylist(false)
      this.selectedComposer = composer
    },

    play: function (composer_song, track = 0, clearPlaylist = false) {
      var arr = composer_song.split('/')
      var composer = arr[0]
      var song = arr.slice(1).join('/')

      if (composer && song) {
        if ((this.playerComposer == composer) && (this.playerSong == song) && (this.playerTrack == track)) {
          this.player.resume();
        } else {
          // different song, let's reset the track number
          if ((this.playerComposer != composer) || (this.playerSong != song)) {
            track = 0;
          }
          this.playerComposer = composer;
          this.playerSong = song;
          this.playerTrack = track;
          if (clearPlaylist)
            this.playlist = [this.playerPath];

          var self = this;

          this.player.loadMusicFromURL(
            this.musicPath,
            {
              track: this.playerTrack
            },
            (function (filename) {
              // onCompletion
              self.songInfo = self.player.getSongInfo()
            }),
            (function () {
              // onFail
            }),
            (function (total, loaded) {
              // onProgress
            })
          );

        }
        this.playing = true
      }
    },

    pause: function () {
      this.player.pause();
      this.playing = false
    },

    changeVolume: function (value) {
      this.player.setVolume(value);
    },

    isSongInPlaylist(song) {
      return this.playlist.indexOf(this.selectedComposer + '/' + song) > -1
    },

    onSelectSong(song) {
      this.selectedSong = song
    },

    nextSong: function () {
      if (this.playerSong) {
        let index = this.playlist.indexOf(this.playerPath);
        if ( index != -1 && index < this.playlist.length ) {
          this.play(this.playlist[++index]);
        }
      }
    },

    previousSong: function () {
      if (this.playerSong) {
        let index = this.playlist.indexOf(this.playerPath);
        if (index != -1 && index > 0) {
          this.play(this.playlist[--index]);
        }
      }
    },

    nextTrack: function () {
      if (this.songInfo.numberOfTracks > 1) {
        this.play(this.playerPath, this.playerTrack + 1);
      }
    },

    previousTrack: function () {
      if (this.playerTrack > 0) {
        this.play(this.playerPath, this.playerTrack - 1);
      }
    },

    clearSearch() {
      this.search = '';
    },

    addToPlaylist(song) {
      this.playlist.push(song)
      // if it was the 1st element, then load the player,
      // set -1 as current track to force to download the song in play method
      if (this.playlist.length == 1) {
        var arr = song.split('/')
        this.playerComposer = arr[0];
        this.playerSong = arr.slice(1).join('/');
        this.playerTrack = -1
      }
    },

    removeFromPlaylist(song) {
      const index = this.playlist.indexOf(song);
      if (index > -1) {
        this.playlist.splice(index, 1);
      }
    },

    setCssHeight(elm, height) {
      elm.style.setProperty('--height', `${height}px`);
    },

    setupEvents() {
      document.addEventListener( 'visibilitychange', e => { this.visible = ( document.visibilityState === 'visible' ) } );
      //window.addEventListener( 'hashchange', e => this.applyRoute( window.location.hash ) );
      //window.addEventListener( 'keydown', this.onKeyboard );
    },

    applyRoute( route, sidebar = false ) {
      const data   = String( route || '' ).replace( /^[\#\/]+|[\/]+$/g, '' ).trim().split( '/' );
      const action = data.length ? data.shift() : '';
      const param  = data.length ? data.shift() : '';

      // select a channel from the url
      // if ( action === 'channel' && param ) {
      //   const channel = this.channels.filter( c => ( c.id === param ) ).shift();
      //   if ( channel && channel.id ) {
      //     return this.selectChannel( channel );
      //   }
      // }
      // // nothing to do, reset player
      // this.closeAudio();
      // this.resetPlayer();
      // this.togglePlaylist( sidebar );
    },

    // on keyboard events
    onKeyboard( e ) {
      const k = e.key || '';
      // if ( k === ' ' && this.channel.id ) return this.togglePlay();
      // if ( k === 'Enter' ) return this.togglePlaylist( true );
      // if ( k === 'Escape' ) return this.togglePlaylist( false );
    },

    updateHeight() {
      let root = document.querySelector(':root');
      this.setCssHeight(root, window.innerHeight);
      window.addEventListener('resize', e => this.setCssHeight(root, window.innerHeight));
    },

    initDisplay() {
      setTimeout(() => {
        document.querySelector('#player-wrap').style.opacity = '1';
        this.init = true;
      }, 100);
    },

    togglePlaylist( state )  {
      const currentstate = typeof state == 'boolean' ? state : !this.sbActive;
      if ( currentstate ) {
        this.sbActive = true;
        this.sbVisible = true;
      } else {
        this.sbVisible = false;
        setTimeout( () => { this.sbActive = false; }, 500 );
      }
    },

    toggleVolumeBar( state ) {
      const nextState = typeof state == 'boolean' ? state : !this.vVisible;
      this.vVisible = nextState
    }
  }
}
</script>


<template>

  <main id="player-wrap" class="player-wrap" style="opacity: 0;">

    <section class="player-layout">

      <header class="header">
        <div class="search">
          <input name="search" type="text" required placeholder="Search" v-model="search" />
          <i class="material-icons clear-icon" @click.prevent="clearSearch()">clear</i>
        </div>

        <div class="user">
          <a href="https://github.com/bobuss/atari_player" target="_blank">
            <img src="@/assets/github.png" />
          </a>
        </div>

      </header>
      <main class="content">
        <div class="content__left">
          <!-- COMPOSER LIST -->
          <section class="navigation">

            <div class="navigation__list">
              <a v-for="(count, composer) in facetedComposers"
                  :key="composer" href="#"
                  class="navigation__list__item"
                  :class="{ navigation__list__item__selected: composer == selectedComposer }"
                  @click.prevent="onSelectComposer(composer)">

                <span :class="{ playing: composer == playerComposer }">{{ composer.replaceAll('_', ' ') }} ({{ count
                }})</span>
              </a>
            </div>
          </section>
          <!-- END COMPOSER LIST -->
        </div>

        <div class="content__middle">

          <!-- SONG LIST -->
          <div class="artist" ref="artist">

            <div class="artist__header">
                <div class="artist__info__name">{{ selectedComposer.replaceAll('_', ' ') }}</div>
            </div>

            <div class="artist__content">

              <div class="overview">

                <div class="overview__albums">
                  <div class="overview__albums__head">

                  </div>
                  <div class="album">
                    <div class="album__tracks">

                      <div class="tracks">
                        <div class="tracks__heading">
                          <div class="tracks__heading__number">#</div>
                          <div class="tracks__heading__title">Song</div>
                        </div>
                        <a v-for="(s, index) in filteredSongs"
                            href="#"
                            :key="s"
                            class="track"
                            :class="{ track__selected: s == selectedSong }"
                            @click.prevent="onSelectSong(s)"
                            @dblclick.prevent="play(selectedComposer + '/' + s, playerTrack, true)"
                            @mouseover="hover = s"
                            @mouseleave="hover = null">

                          <div v-if="s != selectedSong" class="track__number">
                            <span v-if="hover == s">

                              <a v-if="playing && (s == playerSong)" @click.prevent="pause()">
                                <i class="material-icons">pause_arrow</i>
                              </a>

                              <a v-else @click.prevent="play(selectedComposer + '/' + s, playerTrack, true)">
                                <i class="material-icons">play_arrow</i>
                              </a>

                            </span>

                            <span v-else>{{ index + 1 }}</span>

                          </div>
                          <div v-else class="track__number">

                            <a v-if="playing && (s == playerSong)" class="ion-ios-pause" @click.prevent="pause()">
                              <i class="material-icons">pause</i>
                            </a>
                            <a v-else @click.prevent="play(selectedComposer + '/' + s, playerTrack, true)">
                              <i class="material-icons">play_arrow</i>
                            </a>

                          </div>
                          <div :class="{ playing: s == playerSong }" class="track__title">{{ s.replaceAll('_', '').replace(`.${format}`, '') }}</div>

                          <div class="track__added">
                            <a v-if="isSongInPlaylist(s)" @click.prevent="removeFromPlaylist(selectedComposer + '/' + s)">
                              <i class="material-icons">playlist_remove</i>
                            </a>
                            <a v-else @click.prevent="addToPlaylist(selectedComposer + '/' + s)">
                              <i class="material-icons">playlist_add</i>
                            </a>
                          </div>

                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <!-- END SONG LIST -->

          <!-- PLAYLIST -->
          <div class="playlist" :class="{ 'active': sbActive, 'visible': sbVisible }">

            <aside class="artist__content">

              <div class="overview">

                <div class="overview__albums">
                  <div class="overview__albums__head">
                    <h1>Playlist</h1>
                  </div>
                  <div class="album">
                    <div class="album__tracks">

                      <div class="tracks">
                        <div class="tracks__heading">
                          <div class="tracks__heading__number">#</div>
                          <div class="tracks__heading__title">Song</div>
                        </div>
                        <div class="tracks">


                          <a v-for="(s, index) in listOfSongs"
                              href="#"
                              :key="s.path"
                              class="track"
                              :class="{ track__selected: s.path == selectedSong }"
                              @click.prevent="onSelectSong(s.path)"
                              @dblclick.prevent="play(s.path)"
                              @mouseover="hover = s.path"
                              @mouseleave="hover = null">

                            <div v-if="s.path != selectedSong" class="track__number">
                              <span v-if="hover == s.path">

                                <a v-if="playing && (s.path == playerPath)" @click.prevent="pause()">
                                  <i class="material-icons">pause_arrow</i>
                                </a>
                                <a v-else @click.prevent="play(s.path)">
                                  <i class="material-icons">play_arrow</i>
                                </a>

                              </span>

                              <span v-else>{{ index + 1 }}</span>

                            </div>
                            <div v-else class="track__number">
                              <a v-if="playing && (s.path == playerPath)" class="ion-ios-pause" @click.prevent="pause()">
                                <i class="material-icons">pause</i>
                              </a>
                              <a v-else @click.prevent="play(s.path)">
                                <i class="material-icons">play_arrow</i>
                              </a>

                            </div>

                            <div :class="{ playing: s.path == playerPath }" class="track__title">
                              <span class="title">{{ s.title.replaceAll('_', ' ').replace(`.${format}`, '') }}</span>
                              <a class="composer" @click.prevent="onSelectComposer(s.composer)">{{
                                  s.composer.replaceAll('_', ' ')
                              }}</a>
                            </div>
                            <div class="track__added">
                              <a @click.prevent="removeFromPlaylist(s.path)">
                                <i class="material-icons">playlist_remove</i>
                              </a>
                            </div>

                          </a>


                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


            </aside>
          </div>
          <!-- END PLAYLIST -->

        </div>



      </main>


      <footer class="current-track">
        <!-- PLAYER -->
        <section class="playing" ref="playing">
          <div v-if="playerSong" class="playing__song">
            <a class="playing__song__name">{{ playerSong.replaceAll('_', ' ').replace(`.${format}`, '') }}</a>
            <a class="playing__song__artist">{{ playerComposer.replaceAll('_', ' ') }}</a>
          </div>
        </section>
        <div class="current-track__player">

          <!-- <a>
            <i class="material-icons">shuffle</i>
          </a> -->
          <div>
            <a @click.prevent="previousSong()">
              <i class="material-icons">skip_previous</i>
            </a>

            <a v-if="playing" @click.prevent="pause()">
              <i class="material-icons">pause_circle_filled</i>
            </a>
            <a v-else @click.prevent="play(this.playerComposer + '/' + this.playerSong)">
              <i class="material-icons">play_circle_filled</i>
            </a>

            <a @click.prevent="nextSong()">
              <i class="material-icons">skip_next</i>
            </a>

            <!-- <a>
              <i class="material-icons">repeat</i>
            </a> -->

            <a @click.prevent="togglePlaylist()">
              <i class="material-icons" :class="{ playlist_mode: sbVisible }">queue_music</i>
            </a>
          </div>

          <div v-if="songInfo.numberOfTracks">
            <a @click.prevent="previousTrack()">
              <i class="material-icons">navigate_before</i>
            </a>
            <a class="devices">Track: {{ playerTrack + 1 }}/{{ songInfo.numberOfTracks }}</a>
            <a @click.prevent="nextTrack()">
              <i class="material-icons">navigate_next</i>
            </a>
            </div>
            <div>
            <a class="volume">
              <i class="material-icons" @click.prevent="toggleVolumeBar()">volume_up</i>
              <div class="volume_range" :style="{display: vVisible ? 'block' : 'none'}">
                <input type="range" orient="vertical" min="0" max="1" value="1" step="0.1" @change="changeVolume($event.target.value)">
              </div>
            </a>
          </div>





        </div>
        <!-- END PLAYER -->
      </footer>

    </section>
  </main>

</template>


<style lang="scss">
@import '@/assets/global.scss'
</style>
