<template>
  <div class="pet-overlay" v-if="visible" @click.self="$emit('close')">
    <div class="pet-player">
      <video :src="url" ref="v" controls @loadedmetadata="onLoad"></video>
      <div class="pv-info">
        <span class="pv-word">📌 {{ word }}</span>
        <span class="pv-src">📍 {{ title }}</span>
      </div>
      <button class="pv-close" @click="$emit('close')">✕ 关闭</button>
    </div>
  </div>
</template>
<script>
export default {
  name: 'PetVideoOverlay',
  props: {
    visible: Boolean,
    url: String,
    title: String,
    startTime: { type: Number, default: 0 },
    word: String
  },
  methods: {
    onLoad() {
      const v = this.$refs.v
      if (v && this.startTime) v.currentTime = this.startTime
      if (v) v.play().catch(() => {})
    }
  },
  watch: {
    visible(val) {
      // 关闭时暂停
      if (!val && this.$refs.v) this.$refs.v.pause()
    }
  }
}
</script>
<style scoped>
.pet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.88); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
.pet-player { background: #000; border-radius: 14px; max-width: 820px; width: 100%; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
.pet-player video { width: 100%; max-height: 60vh; background: #000; display: block; }
.pv-info { background: #1a1a2e; color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.pv-word { font-size: 16px; font-weight: 600; }
.pv-src { color: #aaa; font-size: 13px; }
.pv-close { display: block; width: 100%; background: #f44336; color: #fff; border: none; padding: 12px; font-size: 15px; cursor: pointer; }
</style>
