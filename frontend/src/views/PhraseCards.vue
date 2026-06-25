<template>
  <div class="pc-page">
    <div class="pc-head">
      <button class="back" @click="$router.push('/grammar')">← 返回</button>
      <h2>📝 固定搭配 ({{ cards.length }})</h2>
      <button class="pc-nav" @click="$router.push('/grammar/phrase-troublesome')">📕 易错 ({{ troublesome }})</button>
    </div>
    <div class="pc-filters">
      <button v-for="g in groups" :key="g" :class="{active: filter===g}" @click="filter=g">{{ g }} {{ groupStats[g] }}</button>
    </div>
    <div v-if="loading" class="pc-loading">加载中...</div>
    <div v-else class="pc-grid">
      <div v-for="c in filtered" :key="c.id" class="pc-card" :class="{flipped:c._flipped}" @click="c._flipped=!c._flipped">
        <div class="pc-front">
          <div class="pc-phrase" @click.stop="speak(c.phrase)">{{ c.phrase }} 🔊</div>
          <span class="pc-wrong" v-if="c.wrong_count">错{{c.wrong_count}}</span>
        </div>
        <div class="pc-back">
          <div class="pc-meaning">{{ c.meaning_zh }}</div>
          <div class="pc-note">💡 {{ c.note }}</div>
          <div class="pc-btns" @click.stop>
            <button class="btn-ok" @click="mark(c,'known')">✅认识</button>
            <button class="btn-no" @click="mark(c,'unknown')">❌不会</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { speak as speakWord } from '../utils/audio'
export default {
  name: 'PhraseCards',
  data() { return { cards: [], loading: true, filter: 'all', troublesome: 0, userId: localStorage.getItem('userId') } },
  computed: {
    groups() { return ['all', ...new Set(this.cards.map(c => c.grp))].filter(g => g !== 'all').sort() },
    filtered() { return this.filter === 'all' || !this.filter ? this.cards : this.cards.filter(c => c.grp === this.filter) },
    groupStats() { const s = {}; this.cards.forEach(c => { s[c.grp] = (s[c.grp]||0)+1 }); return s }
  },
  async mounted() {
    try {
      const res = await fetch(`/api/grammar/phrases?userId=${this.userId}`); const d = await res.json()
      this.cards = d.data.map(c => ({ ...c, _flipped: false }))
      const tr = await fetch(`/api/grammar/phrase-troublesome?userId=${this.userId}`); this.troublesome = (await tr.json()).data.length
    } catch(e) {} finally { this.loading = false }
  },
  methods: {
    speak(t) { speakWord(t) },
    async mark(c, status) {
      c._flipped = false
      await fetch('/api/grammar/phrase-progress', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:this.userId,cardId:c.id,status}) })
      if (status === 'unknown') { c.wrong_count = (c.wrong_count||0)+1; this.troublesome++ }
    }
  }
}
</script>
<style scoped>
.pc-page { padding: 20px; font-family: system-ui,-apple-system,"PingFang SC",sans-serif; max-width: 1000px; margin: 0 auto; }
.pc-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.pc-head h2 { margin: 0; font-size: 18px; color: #1565c0; }
.back { background: #eee; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.pc-nav { background: #fff3e0; border: 1px solid #ffe0b2; color: #e65100; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; margin-left: auto; }
.pc-filters { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
.pc-filters button { background: #f5f5f5; border: 2px solid #e0e0e0; border-radius: 8px; padding: 5px 12px; cursor: pointer; font-size: 12px; text-transform: capitalize; }
.pc-filters button.active { border-color: #1565c0; background: #e3f2fd; color: #0d47a1; font-weight: 600; }
.pc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
.pc-card { position: relative; background: #fff; border: 3px solid #bbdefb; border-radius: 14px; padding: 28px 20px; min-height: 160px; cursor: pointer; transition: transform .12s, box-shadow .12s; }
.pc-card:hover { transform: translateY(-3px); box-shadow: 0 4px 16px rgba(0,0,0,.1); }
.pc-card.flipped { border-color: #90caf9; background: #f5f5f5; }
.pc-front { text-align: center; } .pc-back { display: none; }
.pc-card.flipped .pc-front { display: none; } .pc-card.flipped .pc-back { display: block; text-align: center; }
.pc-phrase { font-size: 26px; font-weight: 600; cursor: pointer; }
.pc-meaning { font-size: 22px; font-weight: 600; color: #333; margin-bottom: 10px; }
.pc-note { font-size: 16px; color: #1565c0; background: #e3f2fd; padding: 10px 14px; border-radius: 10px; margin-bottom: 12px; }
.pc-wrong { position: absolute; top: 8px; right: 10px; font-size: 13px; color: #ef5350; background: #ffebee; padding: 3px 8px; border-radius: 10px; }
.pc-btns { display: flex; gap: 10px; margin-top: 8px; }
.btn-ok, .btn-no { flex: 1; border: none; padding: 12px; border-radius: 10px; cursor: pointer; font-size: 16px; color: #fff; }
.btn-ok { background: #4caf50; } .btn-no { background: #ef5350; }
.pc-loading { color: #888; padding: 30px; text-align: center; }
</style>
