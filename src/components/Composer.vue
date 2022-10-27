<script>
export default {
  name: 'Composer',
  props: {
    composer: {
      type: String,
      required: false
    },
    songs: {
      type: Array,
      required: false
    },
  },
  methods: {
    onClickSelectSong (song) {
      this.$emit('select-song', song)
      this.song = song
    }
  }
}

</script>


<template>
    <div class="artist is-verified" ref="artist">

    <div class="artist__header">
    <div class="artist__info__meta">
        <div class="artist__info__type">Artist</div>

        <div class="artist__info__name">{{ composer }}</div>
    </div>
    </div>

    <div class="artist__content">
    <div class="tab-content">
        <div role="tabpanel" class="tab-pane active" id="artist-overview">
        <div class="overview">

            <div class="overview__artist">
            </div>

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
                    <div v-for="(song, index) in songs" :key="song" class="track" @click.prevent="onClickSelectSong(song)">
                        <div class="track__number">{{ index + 1 }}</div>
                        <div class="track__title"><a href="#">{{ song }}</a></div>
                    </div>
                </div>

                </div>

            </div>
            </div>
        </div>
        </div>
    </div>
    </div>
    </div>
</template>
