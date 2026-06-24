<template>
  <div class="pr-page">
    <div class="head">
      <button class="back" @click="$router.push('/pet')">← 返回</button>
      <h2>PET 错词本（{{ words.length }}）</h2>
    </div>
    <p class="hint">当前「不会」的 PET 词，按单元分组。点「认识」移出（易错表永久保留）。</p>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="!words.length" class="empty">✅ 暂无 PET 错词</div>

    <div v-else class="pet-layout">
      <!-- 左侧目录导航 -->
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

      <!-- 内容 -->
      <main class="content">
        <section v-for="g in grouped" :key="g.unit" :id="'sec-'+g.unit" class="grp">
          <h3 class="grp-h" :class="g.unit.startsWith('covered') ? 'cov' : 'unc'">{{ unitLabel(g.unit) }} <span class="cnt">({{ g.words.length }})</span></h3>
          <div class="grid">
            <div v-for="w in g.words" :key="w.canonical_id" class="rcard" :class="{ flipped: w.flipped }" @click="w.flipped = !w.flipped">
              <div class="face front">
                <span class="cov-tag" v-if="w.is_covered">📺</span>
                <div class="word">{{ w.word }}</div>
                <div class="ph">{{ w.phonetic }}</div>
                <button class="btn-spk" @click.stop="speak(w.word)">🔊</button>
              </div>
              <div class="face back">
                <div class="meaning"><span class="pos" v-if="w.pos">{{ w.pos }}</span>{{ w.meaning }}</div>
                <div class="mnemonic" v-if="w.mnemonic" @click.stop>🔠 {{ w.mnemonic }}</div>
                <div class="acts" @click.stop>
                  <button class="btn-spk" @click="speak(w.word)">🔊</button>
                  <button v-if="w.is_covered" class="btn-vid" @click="openVideo(w)">📺 看视频</button>
                  <button class="btn-ex" @click="w.showEx = !w.showEx">📝例句</button>
                </div>
                <transition name="exfade">
                  <div v-if="w.showEx" class="example" @click.stop>
                    <template v-if="w.example_en">
                      <div class="ex-en" @click="speak(w.example_en)" title="点击朗读">
                        📖 {{ w.example_en }}
                      </div>
                      <div class="ex-cn">{{ w.example_cn }}</div>
                    </template>
                    <div v-else class="ex-none">暂无例句</div>
                  </div>
                </transition>
                <div class="btns" @click.stop>
                  <button class="bk" @click="known(w)">✅ 认识（移出）</button>
                </div>
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
import { fetchPetReview, petProgress, fetchPetVideoLink } from '../utils/pet'
import PetVideoOverlay from '../components/PetVideoOverlay.vue'
export default {
  name: 'PetReview',
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
  async mounted() { await this.load() },
  methods: {
    async load() { try { this.words = (await fetchPetReview(this.userId)).map(w => ({ ...w, flipped: false, showEx: false })) } catch(e){} finally { this.loading = false } },
    unitLabel(gu) { const m = (gu||'').match(/(covered|uncovered)_(\d+)/); if(!m) return gu; return m[1]==='covered' ? `📚 已覆盖·第${parseInt(m[2],10)}组` : `🎯 未覆盖·第${parseInt(m[2],10)}组` },
    unitShort(gu) { const m = (gu||'').match(/_(\d+)/); return m ? `第${parseInt(m[1],10)}组` : gu },
    scrollTo(unit) { const el = document.getElementById('sec-' + unit); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) },
    async openVideo(w) {
      const link = await fetchPetVideoLink(w.canonical_id)
      if (!link || !link.videoUrl) { alert('未找到关联视频'); return }
      this.player = { visible: true, url: link.videoUrl, title: link.videoTitle, startTime: link.startTime || 0, word: w.word }
    },
    async known(w) { await petProgress(this.userId, w.canonical_id, 'known'); this.words = this.words.filter(x => x.canonical_id !== w.canonical_id) }
  }
}
</script>
<style scoped>
.pr-page { padding: 20px; font-family: system-ui,-apple-system,"PingFang SC",sans-serif; }
.head { display:flex; align-items:center; gap:12px; }
.head h2 { margin:0; font-size:18px; }
.back { background:#eee; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-size:14px; }
.hint { color:#888; font-size:12px; }
.pet-layout { display: flex; gap: 20px; align-items: flex-start; margin-top: 12px; }
/* 左侧目录 */
.sidenav { position: sticky; top: 70px; width: 170px; flex-shrink: 0; max-height: calc(100vh - 90px); overflow-y: auto;
  background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 10px; }
.nav-sec { margin-bottom: 14px; }
.nav-h { font-size: 13px; font-weight: 700; margin: 6px 4px; }
.nav-h.cov { color: #2e7d32; }
.nav-h.unc { color: #1565c0; }
.nav-item { display: flex; justify-content: space-between; padding: 6px 10px; border-radius: 6px; cursor: pointer;
  font-size: 13px; color: #444; }
.nav-item:hover { background: #f0f4f8; }
.nav-cnt { color: #999; font-size: 12px; }
/* 内容 */
.content { flex: 1; min-width: 0; }
.grp { margin-bottom: 24px; scroll-margin-top: 70px; }
.grp-h { font-size: 15px; margin: 0 0 10px; }
.grp-h.cov { color: #2e7d32; }
.grp-h.unc { color: #1565c0; }
.cnt { color:#999; font-weight:400; font-size:13px; }
.grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(210px,1fr)); gap:14px; }
.rcard { position:relative; background:#fff; border:2px solid #eee; border-radius:12px; padding:20px 16px; min-height:176px; cursor:pointer; }
.rcard.flipped { border-color:#ef5350; background:#fdecea; }
.face { text-align:center; }
.face.back { display:none; }
.rcard.flipped .front { display:none; }
.rcard.flipped .back { display:block; }
.word { font-size:24px; font-weight:700; margin:12px 0 6px; }
.ph { color:#777; font-size:15px; font-family:monospace; margin-bottom:12px; }
.meaning { font-size:16px; line-height:1.5; margin:10px 4px; }
.mnemonic { font-size:13px; line-height:1.45; margin:6px 4px; padding:7px 10px; background:#e8f5e9; border-left:3px solid #43a047; border-radius:6px; color:#2e7d32; text-align:left; }
.pos { color:#1565c0; margin-right:5px; font-size:12px; }
.btn-spk { background:#f0f4f8; border:1px solid #dde; border-radius:8px; padding:8px 14px; cursor:pointer; font-size:14px; margin:4px; }
.btn-vid { background:#e3f2fd; border:1px solid #bbdefb; border-radius:8px; padding:8px 14px; cursor:pointer; font-size:14px; margin:4px; }
.acts { margin-top:10px; display:flex; gap:6px; justify-content:center; flex-wrap:wrap; }
.bk { background:#4caf50; color:#fff; border:none; padding:9px 14px; border-radius:8px; cursor:pointer; font-size:14px; }
.cov-tag { position:absolute; top:8px; right:10px; font-size:12px; }
.btn-ex { background:#fff3e0; border:1px solid #ffe0b2; border-radius:8px; padding:8px 14px; cursor:pointer; font-size:14px; margin:4px; color:#e65100; }
.example { margin:4px 2px; padding:10px 12px; background:#fffaf2; border:1px dashed #ffcc80; border-radius:10px; text-align:left; }
.ex-en { font-size:14px; line-height:1.5; color:#333; cursor:pointer; }
.ex-en:hover { color:#e65100; }
.ex-cn { font-size:12px; color:#888; margin-top:5px; line-height:1.4; }
.ex-none { font-size:12px; color:#aaa; text-align:center; }
.btns { display:flex; gap:10px; justify-content:center; margin-top:10px; }
.exfade-enter-active, .exfade-leave-active { transition: all .28s ease; overflow:hidden; }
.exfade-enter-from, .exfade-leave-to { opacity:0; max-height:0; margin:0; padding:0 12px; border-width:0; }
.exfade-enter-to, .exfade-leave-from { opacity:1; max-height:240px; }
.loading,.empty { color:#888; padding:20px; }
/* 手机隐藏侧栏 */
@media (max-width: 767px) { .sidenav { display: none; } .pet-layout { display: block; } }
</style>
