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
    <a v-for="c in filteredList"
       :key="c"
       href="#"
       class="navigation__list__item"
       v-bind:class="{ navigation__list__item__selected: c == composer  }"
       @click.prevent="onClickSelectComposer(c)">
      <i class="ion-person"></i>
      <span>{{ c }}</span>
    </a>
  </div>

</template>

