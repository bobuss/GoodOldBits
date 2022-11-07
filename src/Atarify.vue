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

import xmp from './json/xmp.json';
collections['xmp'] = xmp




function doOnTrackEnd() {
    // strange hack here, but it works: repeat current track
    console.log('doOnTrackEnd')
    app.play(app.playerPath, app.playerTrack++);
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
      player: null,
      playerComposer: null,
      playerSong: null,
      playerTrack: 0,
      tracker: 'Fasttracker 2',
      songInfo: {numberOfTracks: 1},
      navHeight: 617,
      artistHeight: 617,
      search: '',
      playing: false,
      playlist: [],
      playlistMode: false
    }
  },
  computed:{
    backendAdapter() {
      switch (this.format) {
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
    //window.removeEventListener('load', this.getHeight);
    //window.removeEventListener('resize', this.getHeight);
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
        case 'xmp':
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
      this.playlistMode = false;
      this.composer = composer
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
    play: function(composer_song, track=0, clearPlaylist=false) {
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
        let index = this.playlist.indexOf(this.playerPath);
        if (index != -1 && index < this.playlist.length) {
          this.play(this.playlist[++index]);
        }
      }
    },
    previousSong: function() {
      if (this.playerSong) {
        let index = this.playlist.indexOf(this.playerPath);
        if (index != -1 && index > 0) {
          this.play(this.playlist[--index]);
        }
      }
    },
    nextTrack: function() {
      if (this.songInfo.numberOfTracks > 1) {
        this.play(this.playerPath, this.playerTrack+1);
      }
    },
    previousTrack: function() {
      if (this.playerTrack > 0) {
        this.play(this.playerPath, this.playerTrack-1);
      }
    },
    clearSearch() {
      this.search = '';
    },
    onAddToPlaylist(song) {
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
    onRemoveFromPlaylist(song) {
      const index = this.playlist.indexOf(song);
      if (index > -1) {
        this.playlist.splice(index, 1);
      }
    },
    switchPlaylistView() {
      this.playlistMode = !this.playlistMode
    }
  }
}
</script>


<template>
  <section class="header" ref="header">
    <div class="search">
      <input name="search" type="text" required placeholder="Search" v-model="search" />
      <i class="material-icons clear-icon" @click.prevent="clearSearch()">clear</i>
    </div>

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
                      :playerComposer="playerComposer"
                      :songInfo="songInfo"
                      @onSelectComposer="onSelectComposer" />

      </section>
    </div>

    <div class="content__middle">

      <Composer :format="format"
                :composer="composer"
                :flatComposerSongs="flatComposerSongs"
                :playerComposer="playerComposer"
                :playerSong="playerSong"
                :playerTrack="playerTrack"
                :playlist="playlist"
                :playing="playing"
                :search="search"
                @playSong="play"
                @pauseSong="pause"
                @onAddToPlaylist="onAddToPlaylist"
                @onRemoveFromPlaylist="onRemoveFromPlaylist"
                v-bind:style="{ height: this.artistHeight + 'px', display: this.playlistMode ? 'none' : 'block' }" />

        <Playlist :format="format"
                :playerPath="playerPath"
                :playerTrack="playerTrack"
                :songInfo="songInfo"
                :playlist="playlist"
                :playing="playing"
                @playSong="play"
                @pauseSong="pause"
                v-bind:style="{ height: this.artistHeight + 'px', display: this.playlistMode ? 'block' : 'none'  }"/>


    </div>
  </section>

  <Player :format="format"
          :composer="playerComposer"
          :playlist="playlist"
          :song="playerSong"
          :track="playerTrack"
          :songInfo="songInfo"
          :playing="playing"
          :playlistMode="playlistMode"
          @playSong="play"
          @pauseSong="pause"
          @previousSong="previousSong"
          @nextSong="nextSong"
          @previousTrack="previousTrack"
          @nextTrack="nextTrack"
          @changeVolume="changeVolume"
          @switchPlaylistView="switchPlaylistView"
          ref="player"/>

</template>


