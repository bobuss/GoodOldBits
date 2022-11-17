<script>

const collections = {}

// import libymWrapper from './libymWrapper'
// import cowbellWrapper from './cowbellWrapper'

import sndh from './json/sndh.json';
collections['sndh'] = sndh

// import ym from './json/ym.json';
// collections['ym'] = ym

import sc68 from './json/sc68.json';
collections['sc68'] = sc68

// import xmp from './json/xmp.json';
// collections['xmp'] = xmp


export default {
  name: 'Player',
  data() {
    return {
      route: '/',
      init: false,
      format: 'sndh',
      selectedComposer: '',
      player: null,
      playerComposer: null,
      playerSong: null,
      playerTrack: 1,
      tracker: 'Protracker',
      songInfo: { numberOfTracks: 1 },
      search: '',
      playing: false,
      queue: [],
      hover: null,
      selectedSong: null,
      sbActive: false,
      sbVisible: false,
      vVisible: false
    }
  },
  watch: {
    queue: {
      deep: true,
      handler(newQueue) {
        localStorage.queue = newQueue
      }
    }
  },
  computed: {

    facetedComposers() {
      const search = this.search.replaceAll(' ', '_').toLowerCase();

      // filter flatSongs (aka format/author/song) by seach, and sort by author
      const filteredSongs = this.flatSongs.filter(song => {
        return song.toLowerCase().includes(search)
      }).sort((a, b) => a.split('/')[1].localeCompare(b.split('/')[1]))

      // count the number of matching songs and group by author
      const groupByComposer = filteredSongs.reduce((group, song) => {
        const category = song.split('/').slice(0,2).join('/')
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

    formats() {
      return Object.keys(collections)
    },

    // backendAdapter() {
    //   switch (this.format) {
    //     case 'ym':
    //       return YMBackendAdapter;
    //     case 'xmp':
    //       return XMPBackendAdapter;
    //     case 'sndh':
    //     case 'sc68':
    //       return SC68BackendAdapter;
    //       break;
    //   }
    // },

    musics() {

      return Object.keys(collections).reduce(
        (acc1,format) => ({
            ...acc1,
            ...Object.keys(collections[format]).reduce(
                (acc2, author) => ({
                    ...acc2,
                    ...{ [`${format}/${author}`]: collections[format][author] }})
            ,{})
        }),{})

    },

    playerPath() {
      return this.playerComposer + '/' + this.playerSong;
    },

    musicPath() {
      return 'musics/' + this.playerPath
      // switch (this.format) {
      //   case 'xmp':
      //     return 'http://modland.com/pub/modules/' + this.tracker + '/' + this.playerPath
      //     break;
      //   case 'sndh':
      //   case 'sc68':
      //     return 'musics/' + this.playerPath
      //     break;
      //   case 'ym':
      //     return 'musics/ym/' + this.playerPath
      //     break;
      // }
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

    listOfSongsInQueue() {
      return this.queue.map(function (path) {
        var arr = path.split('/')
        return {
          'path': path,
          'composer': arr.slice(0,2).join('/'),
          'title': arr.slice(2).join('/')
        }
      })
    }

  },

  updated(){
    this.initDisplay();
  },

  mounted() {
    if (localStorage.queue) {
      let potential_songs = localStorage.queue.split(',')
      this.queue = this.flatSongs.filter(x => potential_songs.includes(x));
      localStorage.queue = this.queue
    }
    this.setupEvents();
    this.updateHeight();
    this.applyRoute( window.location.hash, true ) ;
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

      let self = this;

      ScriptNodePlayer.createInstance(
        new SC68BackendAdapter(),     // backendAdapter
        '',                           // basePath, not needed here
        [],                           // requiredFiles
        false,                        // enableSpectrum
        function() {},                // onPlayerReady
        function() {},                // onTrackReadyToPlay
        function() {                  // onTrackEnd
          // repeat current track
          console.log('doOnTrackEnd')
          self.play(self.playerPath, self.playerTrack);
        },
        function() {}                 // doOnUpdate
      );
      this.player = ScriptNodePlayer.getInstance()

      // switch (this.format) {

      //   case 'xmp':
      //   case 'sndh':
      //   case 'sc68':

      //     let self = this;

      //     ScriptNodePlayer.createInstance(
      //       new SC68BackendAdapter(),     // backendAdapter
      //       '',                           // basePath, not needed here
      //       [],                           // requiredFiles
      //       false,                        // enableSpectrum
      //       function() {},                // onPlayerReady
      //       function() {},                // onTrackReadyToPlay
      //       function() {                  // onTrackEnd
      //         // repeat current track
      //         console.log('doOnTrackEnd')
      //         self.play(self.playerPath, self.playerTrack);
      //       },
      //       function() {}                 // doOnUpdate
      //     );
      //     this.player = ScriptNodePlayer.getInstance()
      //     break;
      //   // case 'xmp':
      //   case 'ym':
      //      this.player = cowbellWrapper
      //      //this.player = libymWrapper
      //      break;
      // }

    },

    onSelectSong(song) {
      this.selectedSong = song
    },

    onSelectComposer(composer, scroll=false) {
      this.toggleQueue(false)
      this.selectedComposer = composer
      const element = document.getElementById("nav_c_" + composer);
      if (scroll && element) element.scrollIntoView({behavior: "smooth", block: "center", inline: "nearest"});
    },

    play: function (composer_song, track = 1) {

      var arr = composer_song.split('/')
      var composer = arr.slice(0,2).join('/')
      var song = arr.slice(2).join('/')

      if (composer && song) {

        if ((this.playerComposer == composer) && (this.playerSong == song) && (this.playerTrack == track)) {
          this.player.resume();
          this.playing = true
        } else {
          // different song, let's reset the track number
          if ((this.playerComposer != composer) || (this.playerSong != song)) {
            track = 1;
          }

          this.setRoute( composer + '/' + song + '/' + track );

        }
      }
    },

    pause: function () {
      this.player.pause();
      this.playing = false;
    },

    resume: function() {
      if ((this.playerComposer ) && (this.playerSong ) && (this.playerTrack )) {
        this.player.resume();
        this.playing = true;
      }
    },

    togglePlay() {
      if (this.playing) {
        this.pause()
      } else {
        this.resume()
      }
    },

    changeVolume: function (value) {
      this.player.setVolume(value);
    },

    isSongInQueue(song) {
      return this.queue.indexOf(this.selectedComposer + '/' + song) > -1
    },

    nextSong: function () {
      if (this.playerSong) {
        let index = this.queue.indexOf(this.playerPath);
        if ( index != -1 && index < this.queue.length ) {
          this.play(this.queue[++index]);
        }
      }
    },

    previousSong: function () {
      if (this.playerSong) {
        let index = this.queue.indexOf(this.playerPath);
        if (index != -1 && index > 0) {
          this.play(this.queue[--index]);
        }
      }
    },

    nextTrack: function () {
      if (this.playerTrack < this.songInfo.numberOfTracks) {
        this.play(this.playerPath, this.playerTrack + 1);
      }
    },

    previousTrack: function () {
      if (this.playerTrack > 1) {
        this.play(this.playerPath, this.playerTrack - 1);
      }
    },

    clearSearch() {
      this.search = '';
    },

    addToQueue(song) {
      this.queue.push(song)
      // if it was the 1st element, then load the player
      if (this.queue.length == 1) {
        var arr = song.split('/')
        this.playerComposer = arr.slice(0,2).join('/');
        this.playerSong = arr.slice(2).join('/');
        this.playerTrack = 0
      }
    },

    removeFromQueue(song) {
      const index = this.queue.indexOf(song);
      if (index > -1) {
        this.queue.splice(index, 1);
      }
    },

    isLoadedInPlayer(composer, song) {
      return (this.playerComposer == composer) && (this.playerSong == song);
    },

    setCssHeight(elm, height) {
      elm.style.setProperty('--height', `${height}px`);
    },

    setupEvents() {
      document.addEventListener( 'visibilitychange', e => { this.visible = ( document.visibilityState === 'visible' ) } );
      window.addEventListener( 'hashchange', e => this.applyRoute( window.location.hash ) );
      window.addEventListener( 'keydown', this.onKeyboard );
      document.addEventListener( 'click' , this.handleVolumeDisplay );

    },

    setRoute( route ) {
      route = '/'+ String( route || '' ).replace( /^[\#\/]+|[\/]+$/g, '' ).trim();
      window.location.hash = route;
      this.route = route;
    },

    applyRoute( route, init=false ) {

      function isPositiveInteger(str) {
        if (typeof str !== 'string') {
          return false;
        }
        const num = Number(str);
        if (Number.isInteger(num) && num > 0) {
          return true;
        }
        return false;
      }

      const data = String( route || '' ).replace( /^[\#\/]+|[\/]+$/g, '' ).trim().split( '/' );

      if (data.length >= 5) {
        this.playerComposer = decodeURIComponent(data.slice(0,2).join('/'))
        this.playerTrack = data.pop()
        if (isPositiveInteger(this.playerTrack)){
          this.playerTrack=parseInt(this.playerTrack)
        } else {
          this.playerTrack=1;
        }
        this.playerSong = decodeURIComponent(data.slice(2).join('/'))

        var self = this;
        this.player.loadMusicFromURL(
          this.musicPath,
          {
            track: this.playerTrack - 1
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

        if (init) {
          this.onSelectComposer(this.playerComposer, true)
          this.playing = false
        } else {
          this.playing = true
        }

        if ( this.queue.indexOf(this.playerPath) == -1 )
          this.queue.unshift(this.playerPath);

      }
    },

    // on keyboard events
    onKeyboard( e ) {
      const k = e.key || '';
      if ( k === ' ' ) {
        e.preventDefault();
        return this.togglePlay();
      }
      // if ( k === 'Enter' ) return this.toggleQueue( true );
      // if ( k === 'Escape' ) return this.toggleQueue( false );
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

    toggleQueue( state )  {
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
    },

    handleVolumeDisplay(event) {
      event.preventDefault();
      const box = document.querySelector('.volume');
      if (this.vVisible && !box.contains(event.target)) {
        this.vVisible = false;
      }
    },

    displaySong(song) {
      var re = new RegExp(this.formats.map(x => `.${x}`).join("|"), 'gi');
      return song.replace(re, matched => '').replaceAll('_', ' ');
    },

    displayComposer(composer) {
      const comp_format = composer.split('/').reverse().map(x => x.replaceAll('_', ' '))
      return comp_format[0] + ' [' + comp_format[1] + ']'
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
                  :id="'nav_c_' + composer"
                  :ref="composer"
                  :key="composer" href="#"
                  class="navigation__list__item"
                  :class="{ navigation__list__item__selected: composer == selectedComposer }"
                  @click.prevent="onSelectComposer(composer)">

                <span :class="{ playing: composer == playerComposer }">{{ displayComposer(composer) }} ({{ count
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
                <div class="artist__info__name">{{ displayComposer(selectedComposer) }}</div>
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

                              <a v-else @click.prevent="play(selectedComposer + '/' + s, playerTrack)">
                                <i class="material-icons">play_arrow</i>
                              </a>

                            </span>

                            <span v-else>{{ index + 1 }}</span>

                          </div>
                          <div v-else class="track__number">

                            <a v-if="playing && (s == playerSong)" class="ion-ios-pause" @click.prevent="pause()">
                              <i class="material-icons">pause</i>
                            </a>
                            <a v-else @click.prevent="play(selectedComposer + '/' + s, playerTrack)">
                              <i class="material-icons">play_arrow</i>
                            </a>

                          </div>
                          <div :class="{ playing: s == playerSong }" class="track__title">{{ displaySong(s) }}</div>

                          <div class="track__added">
                            <a v-if="isSongInQueue(s)" @click.prevent="removeFromQueue(selectedComposer + '/' + s)">
                              <i class="material-icons">remove_from_queue</i>
                            </a>
                            <a v-else @click.prevent="addToQueue(selectedComposer + '/' + s)">
                              <i class="material-icons">add_to_queue</i>
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

          <!-- QUEUE -->
          <div class="queue" :class="{ 'active': sbActive, 'visible': sbVisible }">

            <aside class="artist__content">

              <div class="overview">

                <div class="overview__albums">
                  <div class="overview__albums__head">
                    <h1>Queue</h1>
                  </div>
                  <div class="album">
                    <div class="album__tracks">

                      <div class="tracks">
                        <div class="tracks__heading">
                          <div class="tracks__heading__number">#</div>
                          <div class="tracks__heading__title">Song</div>
                        </div>
                        <div class="tracks">


                          <a v-for="(s, index) in listOfSongsInQueue"
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
                              <span class="title">{{ displaySong(s.title) }}</span>
                              <a class="composer" @click.prevent="onSelectComposer(s.composer, true)">{{
                                  displayComposer(s.composer)
                              }}</a>
                            </div>
                            <div class="track__added">
                              <a @click.prevent="removeFromQueue(s.path)">
                                <i class="material-icons">remove_from_queue</i>
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
          <!-- END Queue -->

        </div>



      </main>


      <footer class="current-track">
        <!-- PLAYER -->
        <section class="playing" ref="playing">
          <div v-if="playerSong" class="playing__song">
            <a class="playing__song__name" >{{ displaySong(playerSong) }}</a>
            <a class="playing__song__artist" @click.prevent="onSelectComposer(playerComposer, true)">{{ displayComposer(playerComposer) }}</a>
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
            <a v-else @click.prevent="play(playerComposer + '/' + playerSong, playerTrack)">
              <i class="material-icons">play_circle_filled</i>
            </a>

            <a @click.prevent="nextSong()">
              <i class="material-icons">skip_next</i>
            </a>

            <!-- <a>
              <i class="material-icons">repeat</i>
            </a> -->

            <a @click.prevent="toggleQueue()">
              <i class="material-icons" :class="{ Queue_mode: sbVisible }">queue_music</i>
            </a>

          </div>

          <div v-if="songInfo.numberOfTracks > 1">
            <a @click.prevent="previousTrack()">
              <i class="material-icons">navigate_before</i>
            </a>
            <a class="devices">Track: {{ playerTrack }}/{{ songInfo.numberOfTracks }}</a>
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
