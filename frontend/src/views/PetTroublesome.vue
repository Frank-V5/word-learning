<template>
  <div class="pt-page">
    <div class="head">
      <button class="back" @click="$router.push('/pet')">← 返回</button>
      <h2>PET 易错表（{{ words.length }}）</h2>
    </div>
    <p class="hint">所有曾标过「不会」的 PET 词，永久累积，按单元分组。反复复习（不会移除）。</p>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="!words.length" class="empty">✅ 暂无</div>

    <div v-else class="pet-layout">
      <aside class="sidenav">
        <div class="nav-sec" v-if="coveredGroups.length">
          <div class="nav-h cov">📚 已覆盖</div>
          <a v-for="g in coveredGroups" :key="g.unit" class="nav-item" @click="scrollTo(g.unit)">
            {{ unitShort(g.unit) }} <span class="nav-cnt">{{ g.words.length }}</span>
          </a>
        </div>
        <div class="nav-sec" v-if="uncoveredGroups.length">
          <div class="nav-h unc">🎯 未覆盖</div>
          <a v-for="g in uncoveredGroups" :key="g.unit" class="nav-item" @click="scrollTo(g.unit)">
            {{ unitShort(g.unit) }} <span class="nav-cnt">{{ g.words.length }}</span>
          </a>
        </div>
      </aside>

      <main class="content">
        <section v-for="g in grouped" :key="g.unit" :id="'sec-'+g.unit" class="grp">
          <h3 class="grp-h" :class="g.unit.startsWith('covered') ? 'cov' : 'unc'">{{ unitLabel(g.unit) }} <span class="cnt">({{ g.words.length }})</span></h3>
          <div class="grid">
            <div v-for="w in g.words" :key="w.canonical_id" class="tcard" :class="{ flipped: w.flipped }" @click="w.flipped = !w.flipped">
              <span class="wc" v-if="w.wrong_count>1">x{{ w.wrong_count }}</span>
              <div class="face front">
                <span class="cov-tag" v-if="w.is_covered">📺</span>
                <div class="word">{{ w.word }}</div>
                <div class="ph">{{ w.phonetic }}</div>
                <button class="btn-spk" @click.stop="speak(w.word)">🔊</button>
              </div>
              <div class="face back">
                <div class="meaning"><span class="pos" v-if="w.pos">{{ w.pos }}</span>{{ w.meaning }}</div>
                <div class="acts" @click.stop>
                  <button class="btn-spk" @click="speak(w.word)">🔊</button>
                  <button v-if="w.is_covered" class="btn-vid" @click="openVideo(w)">📺 看视频</button>
                </div>
                <div class="hint2">错次 {{ w.wrong_count }} · 永久留存</div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>

    <PetVideoOverlay :visible="player.visible" :url="player.url" :title="player.title"
                     :start-time="player.startTime" :word="player.word" @close="player.visible = false" />
  </div>
</template>
<script>
import { speak as speakWord } from '../utils/audio'
import { fetchPetTroublesome, fetchPetVideoLink } from '../utils/pet'
import PetVideoOverlay from '../components/PetVideoOverlay.vue'
export default {
  name: 'PetTroublesome',
  components: { PetVideoOverlay },
  data() {
    return { words: [], loading: true, userId: localStorage.getItem('userId'),
             player: { visible: false, url: '', title: '', startTime: 0, word: '' } }
  },
  computed: {
    grouped() {
      const m = {}
      for (const w of this.words) { const g = w.group_unit || 'other'; (m[g] = m[g] || []).push(w) }
      return Object.keys(m).sort().map(g => ({ unit: g, words: m[g] }))
    },
    coveredGroups() { return this.grouped.filter(g => g.unit.startsWith('covered')) },
    uncoveredGroups() { return this.grouped.filter(g => g.unit.startsWith('uncovered')) }
  },
  async mounted() { try { this.words = (await fetchPetTroublesome(this.userId)).map(w => ({ ...w, flipped: false })) } catch(e){} finally { this.loading = false } },
  methods: {
    speak(t) { speakWord(t) },
    unitLabel(gu) { const m = (gu||'').match(/(covered|uncovered)_(\d+)/); if(!m) return gu; return m[1]==='covered' ? `📚 已覆盖·第${parseInt(m[2],10)}组` : `🎯 未覆盖·第${parseInt(m[2],10)}组` },
    unitShort(gu) { const m = (gu||'').match(/_(\d+)/); return m ? `第${parseInt(m[1],10)}组` : gu },
    scrollTo(unit) { const el = document.getElementById('sec-' + unit); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
    async openVideo(w) {
      const link = await fetchPetVideoLink(w.canonical_id)
      if (!link || !link.videoUrl) { alert('未找到关联视频'); return }
      this.player = { visible: true, url: link.videoUrl, title: link.videoTitle, startTime: link.startTime || 0, word: w.word }
    }
  }
}
</script>
<style scoped>
.pt-page { padding: 20px; font-family: system-ui,-apple-system,"PingFang SC",sans-serif; }
.head { display:flex; align-items:center; gap:12px; }
.head h2 { margin:0; font-size:18px; }
.back { background:#eee; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-size:14px; }
.hint { color:#888; font-size:12px; }
.pet-layout { display: flex; gap: 20px; align-items: flex-start; margin-top: 12px; }
.sidenav { position: sticky; top: 70px; width: 170px; flex-shrink: 0; max-height: calc(100vh - 90px); overflow-y: auto;
  background: #fff; border: 1px solid #ffe0b2; border-radius: 10px; padding: 10px; }
.nav-sec { margin-bottom: 14px; }
.nav-h { font-size: 13px; font-weight: 700; margin: 6px 4px; }
.nav-h.cov { color: #2e7d32; }
.nav-h.unc { color: #1565c0; }
.nav-item { display: flex; justify-content: space-between; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 13px; color: #444; }
.nav-item:hover { background: #fff3e0; }
.nav-cnt { color: #999; font-size: 12px; }
.content { flex: 1; min-width: 0; }
.grp { margin-bottom: 24px; scroll-margin-top: 70px; }
.grp-h { font-size: 15px; margin: 0 0 10px; }
.grp-h.cov { color: #2e7d32; }
.grp-h.unc { color: #1565c0; }
.cnt { color:#999; font-weight:400; font-size:13px; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:14px; }
.tcard { position:relative; background:#fff; border:2px solid #ffe0b2; border-radius:12px; padding:20px 16px; min-height:148px; cursor:pointer; }
.tcard.flipped { border-color:#ff9800; background:#fff8e1; }
.face { text-align:center; }
.face.back { display:none; }
.tcard.flipped .front { display:none; }
.tcard.flipped .back { display:block; }
.word { font-size:24px; font-weight:700; margin:12px 0 6px; }
.ph { color:#777; font-size:15px; font-family:monospace; margin-bottom:12px; }
.meaning { font-size:16px; line-height:1.5; margin:10px 4px; }
.pos { color:#1565c0; margin-right:5px; font-size:12px; }
.btn-spk { background:#f0f4f8; border:1px solid #dde; border-radius:8px; padding:8px 14px; cursor:pointer; font-size:14px; margin:4px; }
.btn-vid { background:#e3f2fd; border:1px solid #bbdefb; border-radius:8px; padding:8px 14px; cursor:pointer; font-size:14px; margin:4px; }
.acts { margin-top:8px; display:flex; gap:6px; justify-content:center; flex-wrap:wrap; }
.hint2 { color:#999; font-size:11px; margin-top:8px; }
.wc { position:absolute; top:8px; right:10px; background:#ef5350; color:#fff; font-size:12px; padding:2px 8px; border-radius:10px; }
.cov-tag { position:absolute; top:8px; left:10px; font-size:12px; }
.loading,.empty { color:#888; padding:20px; }
@media (max-width: 767px) { .sidenav { display: none; } .pet-layout { display: block; } }
</style>
