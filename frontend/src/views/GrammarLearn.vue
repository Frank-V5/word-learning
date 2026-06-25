<template>
  <div class="grammar-page">
    <div class="g-head">
      <button class="back" @click="$router.back()">← 返回</button>
      <h2>{{ point.name }}</h2>
    </div>
    <div v-if="loading" class="g-loading">加载中...</div>
    <div v-else-if="point" class="learn-content">
      <div class="card rule-card">
        <div class="card-title">📖 规则</div>
        <p>{{ point.rule }}</p>
        <div class="formula" v-if="point.formula"><b>公式:</b> {{ point.formula }}</div>
      </div>
      <div class="card ex-card">
        <div class="card-title">💡 例句</div>
        <div v-for="(e, i) in point.examples" :key="i" class="example">
          <div class="ex-en" @click="speak(e.en)">🔊 {{ e.en }}</div>
          <div class="ex-cn">{{ e.cn }}</div>
        </div>
      </div>
      <div class="card pit-card">
        <div class="card-title">⚠ 易错陷阱</div>
        <ul><li v-for="(p, i) in point.pitfalls" :key="i">{{ p }}</li></ul>
      </div>
      <div class="actions">
        <button class="btn-known" @click="mark('known')">✅ 我懂了</button>
        <button class="btn-unknown" @click="mark('unknown')">❌ 还没懂</button>
      </div>
      <button class="btn-practice" @click="goPractice">▶ 去训练（做题巩固）</button>
    </div>
  </div>
</template>
<script>
import { fetchGrammarPoint, grammarProgress } from '../utils/grammar'
import { speak as speakWord } from '../utils/audio'
export default {
  name: 'GrammarLearn',
  data() { return { point: null, loading: true, userId: localStorage.getItem('userId') } },
  async mounted() { await this.load() },
  watch: { '$route.params.id'() { this.load() } },
  methods: {
    async load() {
      this.loading = true
      try { this.point = await fetchGrammarPoint(this.$route.params.id) } catch (e) { console.error(e) } finally { this.loading = false }
    },
    speak(t) { speakWord(t) },
    async mark(status) {
      await grammarProgress(this.userId, this.$route.params.id, status)
      this.$router.back()
    },
    goPractice() {
      this.$router.push('/grammar/practice/' + this.$route.params.id + '?name=' + encodeURIComponent(this.point.name))
    }
  }
}
</script>
<style scoped>
.grammar-page { padding: 24px; font-family: system-ui, -apple-system, "PingFang SC", sans-serif; max-width: 700px; margin: 0 auto; }
.g-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.g-head h2 { margin: 0; color: #1565c0; font-size: 20px; }
.back { background: #eee; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.learn-content { display: flex; flex-direction: column; gap: 16px; }
.card { background: #fff; border-radius: 12px; padding: 20px; border: 1px solid #eee; }
.card-title { font-size: 16px; font-weight: 600; margin-bottom: 10px; }
.rule-card { border-left: 4px solid #1565c0; }
.rule-card p { margin: 0 0 8px; font-size: 15px; line-height: 1.6; }
.formula { font-size: 14px; color: #555; background: #f5f5f5; padding: 8px 12px; border-radius: 6px; }
.ex-card { border-left: 4px solid #4caf50; }
.example { margin-bottom: 12px; }
.ex-en { font-size: 16px; cursor: pointer; color: #333; line-height: 1.5; }
.ex-en:hover { color: #1565c0; }
.ex-cn { font-size: 14px; color: #888; margin-top: 4px; }
.pit-card { border-left: 4px solid #ff9800; background: #fff8e1; }
.pit-card ul { margin: 0; padding-left: 20px; }
.pit-card li { font-size: 14px; line-height: 1.6; margin-bottom: 6px; }
.actions { display: flex; gap: 12px; justify-content: center; margin-top: 8px; }
.btn-known, .btn-unknown { flex: 1; border: none; padding: 14px; border-radius: 10px; cursor: pointer; font-size: 16px; color: #fff; }
.btn-known { background: #4caf50; }
.btn-unknown { background: #ef5350; }
.btn-practice { display: block; width: 100%; background: #1565c0; color: #fff; border: none; padding: 14px; border-radius: 10px; cursor: pointer; font-size: 16px; margin-top: 8px; }
.g-loading { color: #888; padding: 30px; }
</style>
