<template>
  <div class="grammar-page">
    <div class="g-head">
      <button class="back" @click="$router.back()">← 返回</button>
      <h2>训练: {{ pointName }}</h2>
    </div>

    <div v-if="loading" class="g-loading">加载题目...</div>

    <div v-else-if="!questions.length" class="g-loading">该考点暂无题目</div>

    <!-- 完成页 -->
    <div v-else-if="finished" class="finish-card">
      <div class="finish-emoji">{{ correctCount >= questions.length * 0.6 ? '🎉' : '💪' }}</div>
      <div class="finish-text">完成! {{ correctCount }} / {{ questions.length }} 题答对</div>
      <div class="finish-actions">
        <button class="btn-retry" @click="restart">🔄 再练一遍</button>
        <button class="btn-back" @click="$router.back()">← 返回考点</button>
      </div>
    </div>

    <!-- 答题页 -->
    <div v-else class="practice">
      <div class="q-progress">第 {{ idx + 1 }} / {{ questions.length }} 题</div>
      <div class="q-card">
        <div class="q-stem">{{ current.stem }}</div>
        <div class="q-options">
          <button v-for="(opt, i) in current.options" :key="i"
            class="q-opt" :class="optClass(i)"
            :disabled="answered" @click="selectOpt(i)">
            <span class="opt-letter">{{ 'ABCD'[i] }}</span>
            <span class="opt-text">{{ opt }}</span>
          </button>
        </div>
      </div>

      <!-- 三段式解析 (答后显示) -->
      <transition name="exslide">
        <div v-if="answered" class="explanation">
          <div class="ex-result" :class="{ correct: result.correct, wrong: !result.correct }">
            {{ result.correct ? '✅ 答对!' : '❌ 答错了' }}
            正确答案: {{ result.correctAnswer }}
          </div>
          <div class="ex-section">
            <div class="ex-label">✅ 为什么选它</div>
            <div class="ex-body">{{ result.why }}</div>
          </div>
          <div class="ex-section">
            <div class="ex-label">📚 涉及知识点</div>
            <div class="ex-body">{{ result.point_note }}</div>
          </div>
          <div class="ex-section" v-if="result.distractors">
            <div class="ex-label">❌ 其他选项为何错</div>
            <div class="ex-body">{{ result.distractors }}</div>
          </div>
          <button class="btn-next" @click="nextQ">下一题 ▶</button>
        </div>
      </transition>
    </div>
  </div>
</template>

<script>
import { fetchGrammarPractice, grammarAnswer } from '../utils/grammar'
export default {
  name: 'GrammarPractice',
  data() {
    return { questions: [], idx: 0, answered: false, result: null,
             finished: false, correctCount: 0, loading: true,
             userId: localStorage.getItem('userId') }
  },
  computed: {
    pointName() { return this.$route.query.name || '语法训练' },
    current() { return this.questions[this.idx] || {} }
  },
  async mounted() { await this.load() },
  watch: { '$route.params.pointId'() { this.load() } },
  methods: {
    async load() {
      this.loading = true; this.idx = 0; this.answered = false; this.finished = false; this.correctCount = 0
      try { this.questions = await fetchGrammarPractice(this.$route.params.pointId) }
      catch (e) { console.error(e) } finally { this.loading = false }
    },
    async selectOpt(i) {
      if (this.answered) return
      const letter = 'ABCD'[i]
      this.result = await grammarAnswer(this.userId, this.current.id, letter)
      this.answered = true
      if (this.result.correct) this.correctCount++
    },
    optClass(i) {
      if (!this.answered) return ''
      const letter = 'ABCD'[i]
      if (letter === this.result.correctAnswer) return 'opt-correct'
      if (letter === this.current.userAnswer) return 'opt-wrong'
      return 'opt-dim'
    },
    nextQ() {
      this.answered = false; this.result = null
      if (this.idx + 1 >= this.questions.length) { this.finished = true }
      else { this.idx++ }
    },
    restart() { this.idx = 0; this.answered = false; this.finished = false; this.correctCount = 0 }
  }
}
</script>

<style scoped>
.grammar-page { padding: 24px; font-family: system-ui, -apple-system, "PingFang SC", sans-serif; max-width: 700px; margin: 0 auto; }
.g-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.g-head h2 { margin: 0; color: #1565c0; font-size: 18px; }
.back { background: #eee; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.g-loading { color: #888; padding: 30px; text-align: center; }
.q-progress { color: #888; font-size: 13px; margin-bottom: 8px; }
.q-card { background: #fff; border: 2px solid #e3f2fd; border-radius: 12px; padding: 24px; }
.q-stem { font-size: 18px; line-height: 1.6; margin-bottom: 20px; color: #333; }
.q-options { display: flex; flex-direction: column; gap: 10px; }
.q-opt { display: flex; align-items: center; gap: 12px; background: #f8f9fa; border: 2px solid #e0e0e0;
  border-radius: 10px; padding: 14px 18px; cursor: pointer; font-size: 16px; text-align: left; transition: all .12s; }
.q-opt:hover:not(:disabled) { border-color: #90caf9; background: #e3f2fd; }
.q-opt:disabled { cursor: default; }
.opt-letter { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px;
  border-radius: 50%; background: #ddd; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.opt-correct { border-color: #4caf50 !important; background: #c8e6c9 !important; }
.opt-correct .opt-letter { background: #4caf50; color: #fff; }
.opt-wrong { border-color: #ef5350 !important; background: #ffcdd2 !important; }
.opt-wrong .opt-letter { background: #ef5350; color: #fff; }
.opt-dim { opacity: 0.5; }
/* 三段式解析 */
.explanation { margin-top: 16px; }
.ex-result { text-align: center; font-size: 17px; font-weight: 600; padding: 12px; border-radius: 10px; margin-bottom: 12px; }
.ex-result.correct { background: #e8f5e9; color: #2e7d32; }
.ex-result.wrong { background: #fdecea; color: #c62828; }
.ex-section { background: #fff; border-radius: 10px; padding: 14px 18px; margin-bottom: 8px; border-left: 4px solid #1565c0; }
.ex-label { font-size: 14px; font-weight: 600; color: #1565c0; margin-bottom: 4px; }
.ex-body { font-size: 14px; line-height: 1.6; color: #444; }
.btn-next { display: block; width: 100%; background: #1565c0; color: #fff; border: none; padding: 14px;
  border-radius: 10px; font-size: 16px; cursor: pointer; margin-top: 8px; }
.btn-next:hover { background: #0d47a1; }
/* 完成页 */
.finish-card { text-align: center; padding: 40px 20px; }
.finish-emoji { font-size: 48px; }
.finish-text { font-size: 20px; margin: 12px 0 24px; color: #333; }
.finish-actions { display: flex; gap: 12px; justify-content: center; }
.btn-retry, .btn-back { border: none; padding: 12px 24px; border-radius: 10px; cursor: pointer; font-size: 15px; }
.btn-retry { background: #1565c0; color: #fff; }
.btn-back { background: #eee; color: #555; }
/* 过渡 */
.exslide-enter-active, .exslide-leave-active { transition: all .3s ease; overflow: hidden; }
.exslide-enter-from, .exslide-leave-to { opacity: 0; max-height: 0; }
.exslide-enter-to, .exslide-leave-from { opacity: 1; max-height: 600px; }
</style>
