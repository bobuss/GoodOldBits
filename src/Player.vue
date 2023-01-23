<script>

const collections = {}

import sndh from './json/sndh.json';
collections['sndh'] = sndh

// import sc68 from './json/sc68.json';
// collections['sc68'] = sc68

// import ahx from './json/ahx.json';
// collections['ahx'] = ahx

// import s3m from './json/allmods/Screamtracker 3.json';
// collections['Screamtracker 3'] = s3m

// import md0 from './json/allmods/OctaMED MMD0.json';
// collections['OctaMED MMD0'] = md0

// import md1 from './json/allmods/OctaMED MMD1.json';
// collections['OctaMED MMD1'] = md1

// import md2 from './json/allmods/OctaMED MMD2.json';
// collections['OctaMED MMD2'] = md2

// import md3 from './json/allmods/OctaMED MMD3.json';
// collections['OctaMED MMD3'] = md3

// import mdc from './json/allmods/OctaMED MMDC.json';
// collections['OctaMED MMDC'] = mdc

// import ult from './json/allmods/Ultratracker.json';
// collections['Ultratracker'] = ult

// import mdx from './json/allmods/MDX.json';
// collections['MDX'] = mdx

// import Protracker from './json/allmods/Protracker.json';
// collections['Protracker'] = Protracker

// import Soundtracker from './json/allmods/Soundtracker.json';
// collections['Soundtracker'] = Soundtracker

import Fasttracker2 from './json/allmods/Fasttracker 2.json';
collections['Fasttracker 2'] = Fasttracker2



export default {
  name: 'Player',
  data() {
    return {
      route: '/',
      init: false,
      selectedComposer: '',
      playerComposer: null,
      playerSong: null,
      playerFormat: null,
      playerTrack: 1,
      songInfo: { numberOfTracks: 1 },
      search: '',
      playing: false,
      queue: [],
      hover: null,
      selectedSong: null,
      sbActive: false,
      sbVisible: false,
      vVisible: false,
      volume: 0.5
    }
  },
  watch: {
    volume() {
      this.setVolume()
    },

    queue: {
      deep: true,
      handler(newQueue) {
        localStorage.queue = newQueue
      }
    }
  },
  computed: {

    facetedComposers() {

      const searches = this.search.toLowerCase().split(' ');

      const filteredSongs = []
      this.flatSongs.forEach(song => {
        let res = true

        searches.forEach(search => {
          if (song.toLowerCase().indexOf(search) != -1) {
            res = res && true
          } else {
            res = res && false
          }
        })

        if (res) {
          filteredSongs.push(song)
        }

      })
      // count the number of matching songs and group by author
      const groupByComposer = {}

      filteredSongs.forEach(song => {
        const category = song.split('/').slice(0, 2).join('/')
        groupByComposer[category] = groupByComposer[category] ?? 0;
        groupByComposer[category]++
      })

      return groupByComposer

    },

    filteredSongs() {
      const searches = this.search.toLowerCase().split(' ');

      return this.flatComposerSongs.filter(song => {
        return searches.map(search => song.toLowerCase().includes(search)).reduce((acc, key) => {
          return acc && key
        }, true)
      }).map(song => song.substring(this.selectedComposer.length + 1))
    },

    formats() {
      return Object.keys(collections)
    },

    musics() {
      return Object.keys(collections).reduce(
        (acc1, format) => ({
          ...acc1,
          ...Object.keys(collections[format]).reduce(
            (acc2, author) => ({
              ...acc2,
              ...{ [`${format}/${author}`]: collections[format][author] }
            })
            , {})
        }), {})
    },

    playerPath() {
      return this.playerComposer + '/' + this.playerSong;
    },

    musicPath() {

      switch (this.playerFormat) {

        case 'MDX':
        case 'Screamtracker 3':
        case 'OctaMED MMD0':
        case 'OctaMED MMD1':
        case 'OctaMED MMD2':
        case 'OctaMED MMD3':
        case 'OctaMED MMDC':
        case 'Ultratracker':
        case 'Protracker':
        case 'Soundtracker':
        case 'Fasttracker 2':
          return 'http://modland.com/pub/modules/' + this.playerPath
          break;

        default:
          return 'musics/' + this.playerPath
          break;
      }
    },

    processorName() {

      switch (this.playerFormat) {

        case 'Screamtracker 3':
        case 'OctaMED MMD0':
        case 'OctaMED MMD1':
        case 'OctaMED MMD2':
        case 'OctaMED MMD3':
        case 'OctaMED MMDC':
        case 'Ultratracker':
        case 'Protracker':
        case 'Soundtracker':
        case 'Fasttracker 2':

          return 'openmpt';
          break;

        case 'sndh':
        case 'sc68':

          return 'sc68';
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

    listOfSongsInQueue() {
      return this.queue.map(function (path) {
        var arr = path.split('/')
        return {
          'path': path,
          'composer': arr.slice(0, 2).join('/'),
          'title': arr.slice(2).join('/')
        }
      })
    }

  },

  updated() {
    this.initDisplay();
  },

  mounted() {
    const self = this
    this.player.setOnTrackEnd(function() {
      self.nextSong()
    });
    this.player.setOnSongInfoUpdated(function() {
      self.songInfo = this.songInfo
    });
    // this.player.reset() ?
    if (localStorage.queue) {
      let potential_songs = localStorage.queue.split(',')
      this.queue = this.flatSongs.filter(x => potential_songs.includes(x));
      localStorage.queue = this.queue
    }
    this.setupEvents();
    this.updateHeight();
    this.applyRoute(window.location.hash, true);
    this.initDisplay();
  },

  beforeDestroy() {
    console.log('beforeDestroy')
    this.player.pause();
    this.player = null;
  },

  methods: {

    onSelectSong(song) {
      this.selectedSong = song
    },

    onSelectComposer(composer, scroll = false) {
      this.toggleQueue(false)
      this.selectedComposer = composer
      const element = document.getElementById("nav_c_" + composer);
      if (scroll && element) element.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    },

    play: function (composer_song, track = 1) {

      var arr = composer_song.split('/')
      var format = arr[0]
      var composer = arr.slice(0, 2).join('/')
      var song = arr.slice(2).join('/')

      if (composer && song) {

        if ((this.playerFormat == format) && (this.playerComposer == composer) && (this.playerSong == song) && (this.playerTrack == track)) {
          this.player.play();
          this.playing = true
        } else {
          // different song, let's reset the track number
          if ((this.playerFormat != format) || (this.playerComposer != composer) || (this.playerSong != song)) {
            track = 1;
          }

          this.setRoute(composer + '/' + song + '/' + track);

        }
      }
    },

    pause: function () {
      this.player.pause();
      this.playing = false;
    },

    resume: function () {
      if ((this.playerComposer) && (this.playerSong) && (this.playerTrack)) {
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

    setVolume: function () {
      this.player.setVolume(this.volume);
    },

    isSongInQueue(song) {
      return this.queue.indexOf(this.selectedComposer + '/' + song) > -1
    },

    nextSong: function () {
      if (this.playerSong) {
        let index = this.queue.indexOf(this.playerPath);
        if (index != -1 && index < this.queue.length - 1) {
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
        this.playerComposer = arr.slice(0, 2).join('/');
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
      document.addEventListener('visibilitychange', e => { this.visible = (document.visibilityState === 'visible') });
      window.addEventListener('hashchange', e => this.applyRoute(window.location.hash));
      window.addEventListener('keydown', this.onKeyboard);
      document.addEventListener('click', this.handleVolumeDisplay);
      document.querySelector('#scrollArea').addEventListener('scroll', this.scrollEv);
    },

    scrollEv(e) {
      //console.log(e)
    },

    setRoute(route) {
      route = '/' + String(route || '').replace(/^[\#\/]+|[\/]+$/g, '').trim();
      window.location.hash = route;
      this.route = route;
    },

    async applyRoute(route, init = false) {

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

      const data = String(route || '').replace(/^[\#\/]+|[\/]+$/g, '').trim().split('/');

      if (data.length >= 4) {
        // save to compare
        const oldMusicPath = this.musicPath;
        this.playerFormat = decodeURIComponent(data[0])
        this.playerComposer = decodeURIComponent(data.slice(0, 2).join('/'))
        const oldPlayerTrack = this.playerTrack;
        this.playerTrack = data.pop()
        if (isPositiveInteger(this.playerTrack)) {
          this.playerTrack = parseInt(this.playerTrack)
        } else {
          this.playerTrack = 1;
        }
        this.playerSong = decodeURIComponent(data.slice(2).join('/'))


        // pause current player if needed
        if (this.player) this.player.pause()
        this.setVolume();

        if (oldMusicPath == this.musicPath && oldPlayerTrack != this.playerTrack) {
          this.player.setTrack(this.playerTrack)
        } else {
          await this.player.load(this.musicPath, this.processorName, this.playerTrack-1)
        }

        if (this.player) this.player.play()

        if (init) {
          this.onSelectComposer(this.playerComposer, true)
          this.playing = false
        } else {
          this.playing = true
        }

        if (this.queue.indexOf(this.playerPath) == -1)
          this.queue.unshift(this.playerPath);

      }
    },

    // on keyboard events
    onKeyboard(e) {
      if (e.target.nodeName == 'INPUT') {
        return
      }
      const k = e.key || '';
      if (k === ' ') {
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

    toggleQueue(state) {
      const currentstate = typeof state == 'boolean' ? state : !this.sbActive;
      if (currentstate) {
        this.sbActive = true;
        this.sbVisible = true;
      } else {
        this.sbVisible = false;
        setTimeout(() => { this.sbActive = false; }, 500);
      }
    },

    toggleVolumeBar(state) {
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
          <section class="navigation" id="scrollArea">

            <div class="navigation__list">
              <a v-for="(count, composer) in facetedComposers" :id="'nav_c_' + composer" :ref="composer" :key="composer"
                href="#" class="navigation__list__item"
                :class="{ navigation__list__item__selected: composer == selectedComposer }"
                @click.prevent="onSelectComposer(composer)">

                <span :class="{ playing: composer == playerComposer }">{{ displayComposer(composer) }} ({{
                  count
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
                        <a v-for="(s, index) in filteredSongs" href="#" :key="s" class="track"
                          :class="{ track__selected: s == selectedSong }" @click.prevent="onSelectSong(s)"
                          @dblclick.prevent="play(selectedComposer + '/' + s, playerTrack, true)" @mouseover="hover = s"
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


                          <a v-for="(s, index) in listOfSongsInQueue" href="#" :key="s.path" class="track"
                            :class="{ track__selected: s.path == selectedSong }" @click.prevent="onSelectSong(s.path)"
                            @dblclick.prevent="play(s.path)" @mouseover="hover = s.path" @mouseleave="hover = null">

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
                              <a v-if="playing && (s.path == playerPath)" class="ion-ios-pause"
                                @click.prevent="pause()">
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
            <a class="playing__song__name">{{ displaySong(playerSong) }}</a>
            <a class="playing__song__artist" @click.prevent="onSelectComposer(playerComposer, true)">{{
              displayComposer(playerComposer)
            }}</a>
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
              <div class="volume_range" :style="{ display: vVisible ? 'block' : 'none' }">

                <input type="range" orient="vertical" min="0" max="1" step="0.05" v-model="volume" />

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
