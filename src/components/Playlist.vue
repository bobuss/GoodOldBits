<script>
export default {
  name: 'Playlist',
  props: {
    playlist: {
      type: Array,
      default: []
    }
  }
}
</script>

<template>
  <div>
    <h1>Playlist</h1>

    <ul>
      <li v-for="song in playlist">{{ song }}</li>
    </ul>
  </div>
</template>
