<template>
  <div class="plearn-page">
    <div class="head">
      <button class="back" @click="$router.push('/pet')">← 返回</button>
      <h2>{{ unitLabel }}</h2>
      <span class="stat">共 {{ words.length }} · ✅{{ known }} · 🔴{{ unknown }}</span>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else class="cards-grid">
      <div v-for="w in words" :key="w.canonical_id"
           class="pcard" :class="{ flipped: w.flipped, stknown: w.status==='known', stunknown: w.status==='unknown' }"
           @click="w.flipped = !w.flipped">
        <!-- 正面 -->
        <div class="face front">
          <span class="cov-tag" v-if="w.is_covered">📺已覆盖</span>
          <div class="word">{{ w.word }}</div>
          <div class="ph">{{ w.phonetic }}</div>
          <button class="btn-spk" @click.stop="speak(w.word)">🔊 发音</button>
        </div>
        <!-- 反面 -->
        <div class="face back">
          <span class="cov-tag" v-if="w.is_covered">📺已覆盖</span>
          <div class="meaning"><span class="pos" v-if="w.pos">{{ w.pos }}</span>{{ w.meaning }}</div>
          <div class="acts" @click.stop>
            <button class="btn-spk" @click="speak(w.word)">🔊</button>
            <button v-if="w.is_covered" class="btn-vid" @click="openVideo(w)">📺 看视频</button>
          </div>
          <div class="btns" @click.stop>
            <button class="bk" @click="mark(w, 'known')">✅ 认识</button>
            <button class="bu" @click="mark(w, 'unknown')">❌ 不会</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 覆盖词视频浮窗 (不跳转) -->
    <PetVideoOverlay :visible="player.visible" :url="player.url" :title="player.title"
                     :start-time="player.startTime" :word="player.word" @close="player.visible = false" />
  </div>
</template>

<script>
import { speak as speakWord } from '../utils/audio'
import { fetchPetUnit, petProgress, fetchPetVideoLink } from '../utils/pet'
import PetVideoOverlay from '../components/PetVideoOverlay.vue'
export default {
  name: 'PetLearn',
  components: { PetVideoOverlay },
  data() {
    return { words: [], loading: true, userId: localStorage.getItem('userId'),
             player: { visible: false, url: '', title: '', startTime: 0, word: '' } }
  },
  computed: {
    unitLabel() {
      const u = this.$route.params.unit || ''
      return u.startsWith('covered') ? `PET·已覆盖 第${parseInt(u.split('_')[1],10)}组` : `PET·未覆盖 第${parseInt(u.split('_')[1],10)}组`
    },
    known() { return this.words.filter(w => w.status === 'known').length },
    unknown() { return this.words.filter(w => w.status === 'unknown').length }
  },
  async mounted() { await this.load() },
  watch: { '$route.params.unit'() { this.load() } },
  methods: {
    async load() {
      this.loading = true
      try { this.words = (await fetchPetUnit(this.$route.params.unit, this.userId)).map(w => ({ ...w, flipped: false })) }
      catch (e) { console.error(e) } finally { this.loading = false }
    },
    speak(t) { speakWord(t) },
    async mark(w, status) {
      w.status = status; w.flipped = false
      await petProgress(this.userId, w.canonical_id, status)
    },
    async openVideo(w) {
      const link = await fetchPetVideoLink(w.canonical_id)
      if (!link || !link.videoUrl) { alert('未找到关联视频'); return }
      this.player = { visible: true, url: link.videoUrl, title: link.videoTitle,
                      startTime: link.startTime || 0, word: w.word }
    }
  }
}
</script>

<style scoped>
.plearn-page { padding: 16px; font-family: system-ui, -apple-system, "PingFang SC", sans-serif; }
.head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.head h2 { margin: 0; font-size: 18px; }
.back { background: #eee; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; font-size: 14px; }
.stat { color: #666; font-size: 13px; }
/* 卡片放大、防误点 */
.cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; }
.pcard { background: #fff; border: 2px solid #eee; border-radius: 14px; padding: 22px 18px; min-height: 168px;
  cursor: pointer; position: relative; transition: border-color .15s; }
.pcard.stknown { border-color: #66bb6a; background: #f1f8f1; }
.pcard.stunknown { border-color: #ef5350; background: #fdecea; }
.face { text-align: center; }
.face.back { display: none; }
.pcard.flipped .front { display: none; }
.pcard.flipped .back { display: block; }
.word { font-size: 26px; font-weight: 700; margin: 14px 0 6px; }
.ph { color: #777; font-size: 16px; font-family: monospace; margin-bottom: 14px; }
.meaning { font-size: 17px; line-height: 1.5; margin: 10px 4px; }
.pos { color: #1565c0; margin-right: 5px; font-size: 13px; }
.btn-spk, .btn-vid { background: #f0f4f8; border: 1px solid #dde; border-radius: 8px; padding: 9px 16px;
  cursor: pointer; font-size: 15px; margin: 4px; }
.btn-vid { background: #e3f2fd; border-color: #bbdefb; }
.acts { margin: 10px 0; }
.btns { display: flex; gap: 10px; justify-content: center; margin-top: 12px; }
.bk, .bu { flex: 1; border: none; padding: 11px 0; border-radius: 8px; cursor: pointer; font-size: 15px; color: #fff; }
.bk { background: #4caf50; }
.bu { background: #ef5350; }
.cov-tag { position: absolute; top: 8px; right: 10px; font-size: 11px; color: #1565c0; background: #e3f2fd; padding: 3px 8px; border-radius: 4px; }
.loading { color: #888; padding: 20px; }
/* 视频浮窗 */
.pet-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.88); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
.pet-player { background: #000; border-radius: 14px; max-width: 820px; width: 100%; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,.5); }
.pet-player video { width: 100%; max-height: 60vh; background: #000; display: block; }
.pv-info { background: #1a1a2e; color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
.pv-word { font-size: 16px; font-weight: 600; }
.pv-src { color: #aaa; font-size: 13px; }
.pv-close { display: block; width: 100%; background: #f44336; color: #fff; border: none; padding: 12px; font-size: 15px; cursor: pointer; }
</style>
