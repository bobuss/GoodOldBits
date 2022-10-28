<script>

export default {
  name: 'Player',
  props: {
    composer: {
      type: String,
      required: false,
      default: null
    },
    song: {
      type: String,
      required: false,
      default: null
    }
  },
  methods: {
    play() {
      this.$emit('play-song', this.composer, this.song)
    }
  }
}
</script>


<template>
  <section class="current-track" ref="currentTrack">
    <section class="playing" ref="playing">
    <div class="playing__song">
      <a class="playing__song__name">{{ song }}</a>
      <a class="playing__song__artist">{{ composer }}</a>
    </div>
  </section>
    <div class="current-track__player">
      <div class="current-track__actions">
        <a class="ion-ios-skipbackward"></a>
        <a class="ion-ios-play play" @click.prevent="play()"></a>
        <a class="ion-ios-skipforward"></a>
      </div>
      <div class="current-track__progress">
        <div class="current-track__progress__start">0:01</div>
        <div class="current-track__progress__bar">
          <div id="song-progress"></div>
        </div>
        <div class="current-track__progress__finish">3:07</div>
      </div>
    </div>
    <div class="current-track__options">
      <a href="#" class="lyrics">Lyrics</a>
      <span class="controls">
        <a href="#" class="control">
          <i class="ion-navicon"></i>
        </a>
        <a href="#" class="control">
          <i class="ion-shuffle"></i>
        </a>
        <a href="#" class="control">
          <i class="fa fa-refresh"></i>
        </a>
        <a href="#" class="control devices">
          <i class="ion-iphone"></i>
          <span>Devices Available</span>
        </a>
        <a href="#" class="control volume">
          <i class="ion-volume-high"></i>
          <div id="song-volume"></div>
        </a>
      </span>
    </div>
  </section>
</template>
