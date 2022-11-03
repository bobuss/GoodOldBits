<script>
export default {
  name: 'ComposerList',
  props: {
    flatSongs: {
      type: Array
    },
    search: {
      type: String
    }
  },
  data () {
    return {
      selectedComposer: ''
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
    }
  },
  methods: {
    onClickSelectComposer (composer) {
      this.$emit('select-composer', composer)
      this.selectedComposer = composer
    }
  }
}

</script>

<template>

  <div class="navigation__list">
    <a v-for="(count, composer) in facetedComposers"
      :key="composer"
      href="#"
      class="navigation__list__item"
      v-bind:class="{ navigation__list__item__selected: composer == selectedComposer }"
      @click.prevent="onClickSelectComposer(composer)">

      <span>{{ composer.replaceAll('_', ' ') }} ({{ count }})</span>
    </a>
  </div>

</template>

