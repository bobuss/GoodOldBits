<script>
export default {
  name: 'Song',
  props: {
    composer: {
      type: String,
      required: false
    },
    song: {
      type: String,
      required: false
    }
  }
}
</script>


<template>
  <section class="playing" ref="playing">
    <div class="playing__art">
      <img src="https://s3-us-west-2.amazonaws.com/s.cdpn.io/7022/cputh.jpg" alt="Album Art" />
    </div>
    <div class="playing__song">
      <a class="playing__song__name">{{ song }}</a>
      <a class="playing__song__artist">{{ composer }}</a>
    </div>
    <div class="playing__add">
      <i class="ion-checkmark"></i>
    </div>
  </section>
</template>
