<script>
export default {
  name: 'ComposerList',
  props: {
    composers: {
      type: Array,
      required: true
    },
    search: {
      type: String
    }
  },
  data () {
    return {
      composer: 'Furax'
    }
  },
  computed: {
    filteredList() {
      return this.composers.filter(composer => {
        return composer.toLowerCase().includes(this.search.toLowerCase())
      })
    }
  },
  methods: {
    onClickSelectComposer (composer) {
      this.$emit('select-composer', composer)
      this.composer = composer
    }
  }
}

</script>

<template>

  <div class="navigation__list">
    <a v-for="composer in filteredList" :key="composer" href="#" class="navigation__list__item"  @click.prevent="onClickSelectComposer(composer)">
      <i class="ion-person"></i>
      <span>{{ composer }}</span>
    </a>
  </div>

</template>

