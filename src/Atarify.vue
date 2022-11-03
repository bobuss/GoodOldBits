<script>
import ComposerList from './components/ComposerList.vue'
import Composer from './components/Composer.vue'
import Player from './components/Player.vue'

import musics from './json/data.json'
const flatSongs = Object.keys(musics).reduce((acc, key) => {
    return acc.concat(musics[key].map(music => `${key}/${music}`))
}, []);

export default {
  name: 'Atarify',
  data () {
    return {
      composers: Object.keys(musics),
      flatSongs: flatSongs,
      composer: '',
      selectedSong: null,
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
    flatComposerSongs () {

      const composerSongs = musics[this.composer] || [];
      return composerSongs.map(song => this.composer + '/' + song)

    }
  },
  mounted() {
    window.addEventListener('load', this.getHeight);
    window.addEventListener('resize', this.getHeight);
  },
  beforeDestroy() {
    window.removeEventListener('load', this.getHeight);
    window.removeEventListener('resize', this.getHeight);
  },
  components: {
    ComposerList,
    Composer,
    Player
  },
  methods: {
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
        var p = ScriptNodePlayer.getInstance();
        if ((this.playerComposer == composer) && (this.playerSong == song) && (this.playerTrack == track)) {
          p.resume();
        } else {
          this.playerComposer = composer;
          this.playerSong = song;
          this.playerTrack = track;
          this.playlist = [song];

          if (p.isReady()) {
            var self = this;
            p.loadMusicFromURL(
              'musics/' + this.playerComposer + '/' + this.playerSong,
              {
                track: this.playerTrack
              },
              (function(filename){
                // onCompletion
                self.songInfo = ScriptNodePlayer.getInstance().getSongInfo()
              }),
              (function(){
                // onFail
              }),
              (function(total, loaded){
                // onProgress
               })
            );
          }
        }
        this.playing = true
      }
    },
    pause: function() {
      ScriptNodePlayer.getInstance().pause();
      this.playing = false
    },
	  changeVolume: function(value) {
      ScriptNodePlayer.getInstance().setVolume(value);
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
      if (ScriptNodePlayer.getInstance().getSongInfo().numberOfTracks > 1) {
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

      <Composer :composer="composer"
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

    </div>
  </section>

  <Player :composer="playerComposer"
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


