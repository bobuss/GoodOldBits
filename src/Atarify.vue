<script>
import ComposerList from './components/ComposerList.vue'
import Composer from './components/Composer.vue'
import Song from './components/Song.vue'
import Player from './components/Player.vue'

import musics from './json/data.json'


//import { ScriptNodePlayer } from './scriptprocessor_player.js';

export default {
  name: 'Atarify',
  data () {
    return {
      composers: Object.keys(musics),
      composer: 'Furax',
      song: null,
      navHeight: 617,
      artistHeight: 617,
      search: ''
    }
  },
  computed:{
    songs () {
      return musics[this.composer] || null
    },
    computedHeight () {
      return {
        height: this.navHeight + 'px'
      }
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
    Song,
    Player
  },
  methods: {
    onSelectComposer (composer) {
      this.composer = composer
      this.song = null;
    },
    onSelectSong (song) {
      this.song = song;
      //this.$refs.player.play();
    },
    getHeight() {
      const totalHeight = window.innerHeight;
      const headerHeight = this.$refs.header.clientHeight;
      const footerHeight = this.$refs.player.$refs.currentTrack.clientHeight;
      const playlistHeight = 0;
      const nowPlaying = this.$refs.song.$refs.playing.clientHeight;

      this.navHeight = totalHeight - (headerHeight + footerHeight + playlistHeight + nowPlaying);
      this.artistHeight = totalHeight - (headerHeight + footerHeight);
    }
  }
}
</script>


<template>
  <section class="header" ref="header">
    <div class="search">
      <input name="search" type="text" placeholder="Search" v-model="search" />
    </div>
  </section>
  <section class="content">
    <div class="content__left">

      <section class="navigation" ref="navigation" v-bind:style="computedHeight">
        <ComposerList
          :composers="composers"
          :search="search"
          @select-composer="onSelectComposer" />
      </section>

      <Song
        :composer="composer"
        :song="song"
        ref="song" />

    </div>

    <div class="content__middle">

      <Composer
        :composer="composer"
        :songs="songs"
        @select-song="onSelectSong"
        ref="composer"
        v-bind:style="computedHeight" />

    </div>
  </section>


  <Player
    :composer="composer"
    :song="song"
    ref="player"/>


</template>


