<template>
  <div class="vc-page">
    <div class="vc-head">
      <button class="back" @click="$router.push('/grammar')">← 返回</button>
      <h2>🔁 不规则动词 ({{ cards.length }})</h2>
      <button class="vc-nav" @click="$router.push('/grammar/verb-troublesome')">📕 易错 ({{ troublesome }})</button>
    </div>
    <div class="vc-filters">
      <button :class="{active: filter===0}" @click="filter=0">全部 {{ stats.total }}</button>
      <button :class="{active:filter===1}" @click="filter=1">🔴 三形全异 {{ stats.t1 }}</button>
      <button :class="{active:filter===2}" @click="filter=2">🟡 两形相同 {{ stats.t2 }}</button>
      <button :class="{active:filter===3}" @click="filter=3">🟢 三形相同 {{ stats.t3 }}</button>
    </div>
    <div v-if="loading" class="vc-loading">加载中...</div>
    <div v-else class="vc-grid">
      <div v-for="c in filtered" :key="c.id" class="vc-card" :class="['tier'+c.tier, {flipped:c._flipped}]" @click="c._flipped=!c._flipped">
        <div class="vc-front">
          <div class="vc-base" @click.stop="speak(c.base)">{{ c.base }} 🔊</div>
          <div class="vc-meaning">{{ c.meaning_zh }}</div>
          <span class="vc-tier-tag" v-if="c.tier===1">🔴</span>
          <span class="vc-tier-tag" v-else-if="c.tier===2">🟡</span>
          <span class="vc-tier-tag" v-else>🟢</span>
          <span class="vc-wrong" v-if="c.wrong_count">错{{c.wrong_count}}</span>
        </div>
        <div class="vc-back">
          <div class="vc-forms">
            <span class="vc-past" @click.stop="speak(c.past)">{{ c.past }} 🔊</span>
            <span class="vc-part" @click.stop="speak(c.participle)">{{ c.participle }} 🔊</span>
          </div>
          <div class="vc-meaning">{{ c.meaning_zh }}</div>
          <div class="vc-btns" @click.stop>
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
  name: 'VerbCards',
  data() { return { cards: [], loading: true, filter: 0, troublesome: 0, userId: localStorage.getItem('userId') } },
  computed: {
    filtered() { return this.filter ? this.cards.filter(c => c.tier === this.filter) : this.cards },
    stats() { return { total: this.cards.length, t1: this.cards.filter(c=>c.tier===1).length, t2: this.cards.filter(c=>c.tier===2).length, t3: this.cards.filter(c=>c.tier===3).length } }
  },
  async mounted() {
    try {
      const res = await fetch(`/api/grammar/verbs?userId=${this.userId}`); const d = await res.json()
      this.cards = d.data.map(c => ({ ...c, _flipped: false }))
      const tr = await fetch(`/api/grammar/verb-troublesome?userId=${this.userId}`); this.troublesome = (await tr.json()).data.length
    } catch(e) {} finally { this.loading = false }
  },
  methods: {
    speak(t) { speakWord(t) },
    async mark(c, status) {
      c._flipped = false
      await fetch('/api/grammar/verb-progress', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({userId:this.userId,cardId:c.id,status}) })
      if (status === 'unknown') { c.wrong_count = (c.wrong_count||0)+1; this.troublesome++ }
    }
  }
}
</script>
<style scoped>
.vc-page { padding: 20px; font-family: system-ui,-apple-system,"PingFang SC",sans-serif; max-width: 1000px; margin: 0 auto; }
.vc-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.vc-head h2 { margin: 0; font-size: 18px; color: #1565c0; }
.back { background: #eee; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.vc-nav { background: #fff3e0; border: 1px solid #ffe0b2; color: #e65100; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; margin-left: auto; }
.vc-filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.vc-filters button { background: #f5f5f5; border: 2px solid #e0e0e0; border-radius: 8px; padding: 6px 14px; cursor: pointer; font-size: 13px; }
.vc-filters button.active { border-color: #1565c0; background: #e3f2fd; color: #0d47a1; font-weight: 600; }
.vc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.vc-card { position: relative; background: #fff; border-radius: 14px; padding: 28px 20px; min-height: 180px; cursor: pointer; transition: transform .12s, box-shadow .12s; }
.vc-card:hover { transform: translateY(-3px); box-shadow: 0 4px 16px rgba(0,0,0,.1); }
.vc-card.tier1 { border: 3px solid #ef9a9a; } .vc-card.tier2 { border: 3px solid #fff176; } .vc-card.tier3 { border: 3px solid #a5d6a7; }
.vc-front { text-align: center; } .vc-back { display: none; }
.vc-card.flipped .vc-front { display: none; } .vc-card.flipped .vc-back { display: block; text-align: center; }
.vc-base { font-size: 30px; font-weight: 700; margin-bottom: 12px; cursor: pointer; }
.vc-forms { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.vc-past, .vc-part { font-size: 24px; font-weight: 600; cursor: pointer; }
.vc-past { color: #e65100; } .vc-part { color: #1565c0; }
.vc-meaning { font-size: 16px; color: #666; }
.vc-tier-tag { position: absolute; top: 8px; right: 10px; font-size: 16px; }
.vc-wrong { position: absolute; top: 8px; left: 10px; font-size: 13px; color: #ef5350; background: #ffebee; padding: 3px 8px; border-radius: 10px; }
.vc-btns { display: flex; gap: 10px; margin-top: 16px; }
.btn-ok, .btn-no { flex: 1; border: none; padding: 12px; border-radius: 10px; cursor: pointer; font-size: 16px; color: #fff; }
.btn-ok { background: #4caf50; } .btn-no { background: #ef5350; }
.vc-loading { color: #888; padding: 30px; text-align: center; }
</style>
