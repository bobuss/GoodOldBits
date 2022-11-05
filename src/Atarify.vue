<script>

const collections = {}

import ComposerList from './components/ComposerList.vue'
import Composer from './components/Composer.vue'
import Player from './components/Player.vue'
import Playlist from './components/Playlist.vue'
import libymWrapper from './libymWrapper'

import sndh from './json/sndh.json';
collections['sndh'] = sndh

import ym from './json/ym.json';
collections['ym'] = ym

import sc68 from './json/sc68.json';
collections['sc68'] = sc68


function doOnTrackEnd() {
    // strange hack here, but it works: repeat current track
    console.log('doOnTrackEnd')
    app.play(app.playerComposer, app.playerSong, app.playerTrack++);
}
function doOnTrackReadyToPlay() {
    //ScriptNodePlayer.getInstance().play();
    //songDisplay.redrawSongInfo();
}
function doOnPlayerReady() {
    //if (playerControls) playerControls.playNextSong();
}
function doOnUpdate() { } // unused


export default {
  name: 'Atarify',
  data () {
    return {
      format: 'sc68',
      composer: '',
      selectedSong: null,
      player: null,
      playerComposer: null,
      playerSong: null,
      playerTrack: 0,
      songInfo: {numberOfTracks: 1},
      navHeight: 617,
      artistHeight: 617,
      search: '',
      playing: false,
      playlist: []
    }
  },
  computed:{
    backendAdapter() {
      switch (this.format) {
        case 'sndh':
        case 'sc68':
          return SC68BackendAdapter;
          break;
      }
    },
    musics() {
      return collections[this.format]
    },
    composers(){
      return Object.keys(this.musics)
    },
    flatComposerSongs () {
      const composerSongs = this.musics[this.composer] || [];
      return composerSongs.map(song => this.composer + '/' + song)
    },
    flatSongs() {
      return Object.keys(this.musics).reduce((acc, key) => {
        return acc.concat(this.musics[key].map(music => `${key}/${music}`))
      }, []);
    }
  },
  mounted() {
    window.addEventListener('load', this.getHeight);
    window.addEventListener('resize', this.getHeight);
  },
  created() {
    this.createPlayerInstance();
  },
  beforeDestroy() {
    this.player.pause();
    this.player = null;
    window.removeEventListener('load', this.getHeight);
    window.removeEventListener('resize', this.getHeight);
  },
  components: {
    ComposerList,
    Composer,
    Player,
    Playlist
  },
  methods: {
    createPlayerInstance() {

      switch (this.format) {
        case 'ym':
          this.player = libymWrapper
          break;
        case 'sndh':
        case 'sc68':
          const backendAdapter = this.backendAdapter;
          ScriptNodePlayer.createInstance(
            new this.backendAdapter(), // backendAdapter
            '',                        // basePath, not needed here
            [],                        // requiredFiles
            true,                      // enableSpectrum
            doOnPlayerReady,           // onPlayerReady
            doOnTrackReadyToPlay,      // onTrackReadyToPlay
            doOnTrackEnd,              // onTrackEnd
            doOnUpdate                 // doOnUpdate
          );
          this.player = ScriptNodePlayer.getInstance()
          break;
      }

    },
    onSelectComposer (composer) {
      this.composer = composer
    },
    onSelectSong (song) {
      this.selectedSong = song;
    },
    getHeight() {
      const totalHeight = window.innerHeight;
      const headerHeight = this.$refs.header.clientHeight;
      const footerHeight = this.$refs.player.$refs.currentTrack.clientHeight;

      const totalWidth = window.innerWidth;
      if (totalWidth <= 768) {
        this.navHeight = 200;
        this.artistHeight = totalHeight - (footerHeight + 200);
      } else {
        this.navHeight = totalHeight - (headerHeight + footerHeight);
        this.artistHeight = totalHeight - (headerHeight + footerHeight);
      }
    },
    play: function(composer, song, track=0) {
      if (composer && song) {
        if ((this.playerComposer == composer) && (this.playerSong == song) && (this.playerTrack == track)) {
          this.player.resume();
        } else {
          this.playerComposer = composer;
          this.playerSong = song;
          this.playerTrack = track;
          this.playlist = [song];


          var self = this;
          var path = 'musics/' + this.format + '/' + this.playerComposer + '/' + this.playerSong;
          this.player.loadMusicFromURL(
            path,
            {
              track: this.playerTrack
            },
            (function(filename){
              // onCompletion
              self.songInfo = self.player.getSongInfo()
            }),
            (function(){
              // onFail
            }),
            (function(total, loaded){
              // onProgress
             })
          );

        }
        this.playing = true
      }
    },
    pause: function() {
      this.player.pause();
      this.playing = false
    },
	  changeVolume: function(value) {
      this.player.setVolume(value);
    },
    nextSong: function() {
      if (this.playerSong) {
        let index = this.playlist.indexOf(this.playerSong);
        if (index != -1 && index < this.playlist.length) {

          this.onSelectSong(this.playlist[++index]);
          this.play(this.playerComposer, this.selectedSong);

        }
      }
    },
    previousSong: function() {
      if (this.playerSong) {
        let index = this.playlist.indexOf(this.playerSong);
        if (index != -1 && index > 0) {

          this.onSelectSong(this.playlist[--index]);
          this.play(this.playerComposer, this.selectedSong);

        }
      }
    },
    nextTrack: function() {
      if (this.player.songInfo.numberOfTracks > 1) {
        this.play(this.playerComposer, this.playerSong, this.playerTrack+1);
      }
    },
    previousTrack: function() {
      if (this.playerTrack > 0) {
        this.play(this.playerComposer, this.playerSong, this.playerTrack-1);
      }
    },
    clearSearch() {
      this.search = '';
    },
    // switchCollection(format) {
    //   this.playerComposer = null;
    //   this.playerSong = null;
    //   this.playerTrack = 1;
    //   this.createPlayerInstance();
    //   this.format = format;
    // }
  }
}
</script>


<template>
  <section class="header" ref="header">
    <div class="search">
      <input name="search" type="text" required placeholder="Search" v-model="search" />
      <i class="material-icons clear-icon" @click.prevent="clearSearch()">clear</i>
    </div>

<!--
    <a @click.prevent="switchCollection('ym')">ym</a>
    <a @click.prevent="switchCollection('sndh')">sndh</a>
    <a @click.prevent="switchCollection('sc68')">sc68</a>
-->

    <div class="user">
      <a href="https://github.com/bobuss/atari_player" target="_blank">
        <img src="@/assets/github.png" />
      </a>
    </div>

  </section>
  <section class="content">
    <div class="content__left">
      <section class="navigation" ref="navigation" v-bind:style="{ height: this.navHeight + 'px' }">

        <ComposerList :flatSongs="flatSongs"
                      :search="search"
                      @select-composer="onSelectComposer" />

      </section>
    </div>

    <div class="content__middle">

      <Composer :format="format"
                :composer="composer"
                :flatComposerSongs="flatComposerSongs"
                :selectedSong="selectedSong"
                :playerComposer="playerComposer"
                :playerSong="playerSong"
                :playerTrack="playerTrack"
                :playing="playing"
                :search="search"
                @playSong="play"
                @pauseSong="pause"
                @onSelectSong="onSelectSong"
                ref="composer"
                v-bind:style="{ height: this.artistHeight + 'px' }" />

    </div>

    <div class="content__right">

      <Playlist :playlist="playlist" />

    </div>
  </section>

  <Player :format="format"
          :composer="playerComposer"
          :playlist="playlist"
          :song="playerSong"
          :track="playerTrack"
          :songInfo="songInfo"
          :playing="playing"
          @playSong="play"
          @pauseSong="pause"
          @previousSong="previousSong"
          @nextSong="nextSong"
          @previousTrack="previousTrack"
          @nextTrack="nextTrack"
          @changeVolume="changeVolume"
          ref="player"/>

</template>


