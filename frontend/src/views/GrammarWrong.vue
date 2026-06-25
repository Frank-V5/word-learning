<template>
  <div class="grammar-page">
    <div class="g-head"><button class="back" @click="$router.push('/grammar')">← 返回</button><h2>📒 语法错题本</h2></div>
    <p class="g-sub">做错的题，重做一遍。做对自动移出。</p>
    <div v-if="loading" class="g-loading">加载中...</div>
    <div v-else-if="!questions.length" class="g-loading">✅ 暂无错题</div>
    <div v-else-if="finished" class="g-loading">🎉 全部重做完毕！<br><button class="btn-back" @click="$router.push('/grammar')">← 返回</button></div>
    <div v-else class="practice">
      <div class="q-progress">错题 {{ idx + 1 }} / {{ questions.length }} · {{ current.point_name }}</div>
      <div class="q-card">
        <div class="q-stem">{{ current.stem }}</div>
        <div class="q-options">
          <button v-for="(opt, i) in current.options" :key="i" class="q-opt" :class="optClass(i)" :disabled="answered" @click="redo(i)">
            <span class="opt-letter">{{ 'ABCD'[i] }}</span><span class="opt-text">{{ opt }}</span>
          </button>
        </div>
      </div>
      <transition name="exslide">
        <div v-if="answered" class="explanation">
          <div class="ex-result" :class="{ correct: result.correct, wrong: !result.correct }">
            {{ result.correct ? '✅ 答对! 已移出错题本' : '❌ 再想想' }} 正确答案: {{ result.correctAnswer }}
          </div>
          <div class="ex-section"><div class="ex-label">✅ 为什么选它</div><div class="ex-body">{{ result.why }}</div></div>
          <div class="ex-section"><div class="ex-label">📚 涉及知识点</div><div class="ex-body">{{ result.point_note }}</div></div>
          <button class="btn-next" @click="nextQ">下一题 ▶</button>
        </div>
      </transition>
    </div>
  </div>
</template>
<script>
import { fetchGrammarWrong, grammarRedo } from '../utils/grammar'
export default {
  name: 'GrammarWrong',
  data() { return { questions: [], idx: 0, answered: false, result: null, finished: false, loading: true, userId: localStorage.getItem('userId') } },
  computed: { current() { return this.questions[this.idx] || {} } },
  async mounted() { await this.load() },
  methods: {
    async load() { this.loading = true; try { this.questions = await fetchGrammarWrong(this.userId) } catch(e){} finally { this.loading = false } },
    async redo(i) {
      if (this.answered) return
      this.result = await grammarRedo(this.userId, this.current.id, 'ABCD'[i])
      this.answered = true
      if (this.result.correct) this.questions.splice(this.idx, 1) // 移出
    },
    optClass(i) {
      if (!this.answered) return ''
      const l = 'ABCD'[i]
      if (l === this.result.correctAnswer) return 'opt-correct'
      return 'opt-dim'
    },
    nextQ() { this.answered = false; this.result = null; if (this.idx >= this.questions.length) this.idx = Math.max(0, this.questions.length - 1); if (!this.questions.length) this.finished = true }
  }
}
</script>
<style scoped>
.grammar-page { padding: 24px; font-family: system-ui, -apple-system, "PingFang SC", sans-serif; max-width: 700px; margin: 0 auto; }
.g-head { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
.g-head h2 { margin: 0; color: #e65100; }
.back { background: #eee; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.g-sub { color: #888; font-size: 13px; margin: 0 0 16px; }
.g-loading { color: #888; padding: 30px; text-align: center; }
.btn-back { background: #eee; border: none; padding: 10px 20px; border-radius: 8px; cursor: pointer; margin-top: 16px; }
.q-progress { color: #888; font-size: 13px; margin-bottom: 8px; }
.q-card { background: #fff; border: 2px solid #ffe0b2; border-radius: 12px; padding: 24px; }
.q-stem { font-size: 18px; line-height: 1.6; margin-bottom: 20px; }
.q-options { display: flex; flex-direction: column; gap: 10px; }
.q-opt { display: flex; align-items: center; gap: 12px; background: #f8f9fa; border: 2px solid #e0e0e0; border-radius: 10px; padding: 14px 18px; cursor: pointer; font-size: 16px; text-align: left; }
.q-opt:disabled { cursor: default; }
.opt-letter { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: #ddd; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.opt-correct { border-color: #4caf50 !important; background: #c8e6c9 !important; }
.opt-correct .opt-letter { background: #4caf50; color: #fff; }
.opt-dim { opacity: 0.5; }
.explanation { margin-top: 16px; }
.ex-result { text-align: center; font-size: 16px; font-weight: 600; padding: 12px; border-radius: 10px; margin-bottom: 12px; }
.ex-result.correct { background: #e8f5e9; color: #2e7d32; }
.ex-result.wrong { background: #fdecea; color: #c62828; }
.ex-section { background: #fff; border-radius: 10px; padding: 14px 18px; margin-bottom: 8px; border-left: 4px solid #e65100; }
.ex-label { font-size: 14px; font-weight: 600; color: #e65100; margin-bottom: 4px; }
.ex-body { font-size: 14px; line-height: 1.6; color: #444; }
.btn-next { display: block; width: 100%; background: #e65100; color: #fff; border: none; padding: 14px; border-radius: 10px; font-size: 16px; cursor: pointer; margin-top: 8px; }
.exslide-enter-active, .exslide-leave-active { transition: all .3s ease; overflow: hidden; }
.exslide-enter-from, .exslide-leave-to { opacity: 0; max-height: 0; }
.exslide-enter-to, .exslide-leave-from { opacity: 1; max-height: 600px; }
</style>
