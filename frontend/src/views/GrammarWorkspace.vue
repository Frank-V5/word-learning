<template>
  <div class="gw-page">
    <!-- 顶部条 -->
    <div class="gw-topbar">
      <h2>🔤 PET 语法训练</h2>
      <div class="gw-navs">
        <button class="gw-nav" @click="startMixed">🎲 随机练习</button>
        <button class="gw-nav" @click="toggleDiag">📊 弱项诊断</button>
        <button class="gw-nav" @click="$router.push('/grammar/verbs')">🔁 动词变形</button>
        <button class="gw-nav" @click="$router.push('/grammar/phrases')">📝 固定搭配</button>
        <button class="gw-nav" @click="$router.push('/grammar/wrong')">📒 错题本</button>
        <button class="gw-nav" @click="$router.push('/grammar/troublesome')">📕 易错本</button>
      </div>
    </div>

    <!-- 弱项诊断面板 -->
    <transition name="diag">
      <div v-if="showDiag" class="diag-panel">
        <div v-if="!diagData.length" class="diag-empty">✅ 暂无错题数据，做多题后再来看诊断</div>
        <div v-else>
          <div class="diag-title">📊 你的语法弱项（按错次排序）</div>
          <div v-for="(d, i) in diagData" :key="d.point_id" class="diag-row" @click="selectPoint(d.point_id); showDiag=false">
            <span class="diag-rank">{{ i + 1 }}</span>
            <span class="diag-name">{{ d.name }}</span>
            <span class="diag-cat">{{ d.category }}</span>
            <span class="diag-bar"><span class="diag-fill" :style="{ width: Math.min(d.wrong_count * 20, 100) + '%' }"></span></span>
            <span class="diag-count">错{{ d.wrong_count }}次</span>
          </div>
          <div class="diag-hint">点击任意弱项，直接去练该考点</div>
        </div>
      </div>
    </transition>

    <!-- 移动端考点选择器 -->
    <select v-if="isMobile" class="gw-mobile-select" v-model="selectedId" @change="selectPoint(selectedId)">
      <optgroup v-for="cat in categories" :key="cat.category" :label="cat.category">
        <option v-for="p in cat._points" :key="p.id" :value="p.id">{{ statusIcon(p.status) }} {{ p.name }}</option>
      </optgroup>
    </select>

    <div class="gw-layout">
      <!-- 左侧导航树 -->
      <aside class="gw-sidebar" v-if="!isMobile">
        <div class="gw-tree">
          <div v-for="cat in categories" :key="cat.category" class="gw-cat">
            <div class="gw-cat-header" @click="toggleCat(cat.category)">
              <span class="gw-arrow">{{ openCats[cat.category] ? '▾' : '▸' }}</span>
              <span class="gw-cat-name">{{ cat.category }}</span>
              <span class="gw-cat-progress">{{ cat.known || 0 }}/{{ cat.total }}</span>
            </div>
            <div v-show="openCats[cat.category]" class="gw-points">
              <div v-for="p in cat._points" :key="p.id" class="gw-point"
                   :class="{ active: p.id === selectedId }" @click="selectPoint(p.id)">
                <span class="gw-pstatus">{{ statusIcon(p.status) }}</span>
                <span class="gw-pname">{{ p.name }}</span>
                <span v-if="p.wrong" class="gw-pwrong">{{ p.wrong }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="gw-total">📊 已学 <b>{{ totalKnown }}</b> / {{ totalPoints }}</div>
      </aside>

      <!-- 右侧内容 -->
      <main class="gw-content">
        <div v-if="!selectedId" class="gw-empty">← 左侧选一个考点开始学习</div>
        <template v-else>
          <!-- 知识点卡 -->
          <div v-if="loadingPoint" class="gw-loading">加载知识点...</div>
          <template v-else-if="point">
            <div class="kp-card">
              <div class="kp-title">{{ point.name }}</div>
              <div class="kp-rule">
                <div class="kp-label">📖 规则</div>
                <p>{{ point.rule }}</p>
                <div class="kp-formula" v-if="point.formula"><b>公式:</b> {{ point.formula }}</div>
              </div>
              <div class="kp-examples" v-if="point.examples && point.examples.length">
                <div class="kp-label">💡 例句</div>
                <div v-for="(e, i) in point.examples" :key="i" class="kp-example">
                  <span class="kp-ex-en" @click="speak(e.en)">🔊 {{ e.en }}</span>
                  <span class="kp-ex-cn">{{ e.cn }}</span>
                </div>
              </div>
              <div class="kp-pitfalls" v-if="point.pitfalls && point.pitfalls.length">
                <div class="kp-label">⚠ 易错陷阱</div>
                <ul><li v-for="(p, i) in point.pitfalls" :key="i">{{ p }}</li></ul>
              </div>
              <div class="kp-actions">
                <button class="btn-known" @click="markPoint('known')">✅ 懂了</button>
                <button class="btn-unknown" @click="markPoint('unknown')">❌ 还没懂</button>
              </div>
            </div>

            <!-- 练习题 -->
            <div class="qp-section">
              <div class="qp-title">📝 练习题 ({{ questions.length }}题)</div>
              <div v-if="loadingQ" class="gw-loading">加载题目...</div>
              <div v-else-if="!questions.length" class="gw-noq">该考点暂无题目（生成中）</div>
              <div v-else>
                <div v-for="(q, qi) in questions" :key="q.id" class="qp-card" :class="{ answered: q._answered }">
                  <div class="qp-stem">Q{{ qi + 1 }}. {{ q.stem }}</div>
                  <div class="qp-options">
                    <button v-for="(opt, oi) in q.options" :key="oi"
                      class="qp-opt" :class="optClass(q, oi)" :disabled="q._answered"
                      @click="answerQ(q, oi)">
                      <span class="qp-letter">{{ 'ABCD'[oi] }}</span>
                      <span>{{ opt }}</span>
                    </button>
                  </div>
                  <!-- 三段式解析 -->
                  <transition name="exslide">
                    <div v-if="q._answered && q._result" class="qp-explain">
                      <div class="qp-result" :class="{ ok: q._result.correct, no: !q._result.correct }">
                        {{ q._result.correct ? '✅ 答对!' : '❌ 答错' }} · 正确答案: {{ q._result.correctAnswer }}
                      </div>
                      <div class="qp-ex-block"><div class="qp-ex-l">✅ 为什么选它</div><div class="qp-ex-b">{{ q._result.why }}</div></div>
                      <div class="qp-ex-block"><div class="qp-ex-l">📚 涉及知识点</div><div class="qp-ex-b">{{ q._result.point_note }}</div></div>
                      <div class="qp-ex-block" v-if="q._result.distractors"><div class="qp-ex-l">❌ 其他选项为何错</div><div class="qp-ex-b">{{ q._result.distractors }}</div></div>
                    </div>
                  </transition>
                </div>
              </div>
            </div>
          </template>
        </template>
      </main>
    </div>
  </div>
</template>

<script>
import { speak as speakWord } from '../utils/audio'
import { fetchGrammarCategories, fetchGrammarCat, fetchGrammarPoint, fetchGrammarPractice, grammarProgress, grammarAnswer, fetchGrammarMixed, fetchGrammarDiagnosis } from '../utils/grammar'

export default {
  name: 'GrammarWorkspace',
  data() {
    return {
      categories: [], openCats: {}, selectedId: null,
      point: null, questions: [],
      loadingPoint: false, loadingQ: false,
      showDiag: false, diagData: [],
      isMobile: window.innerWidth < 768,
      userId: localStorage.getItem('userId')
    }
  },
  computed: {
    totalKnown() { return this.categories.reduce((s, c) => s + (c.known || 0), 0) },
    totalPoints() { return this.categories.reduce((s, c) => s + (c.total || 0), 0) }
  },
  async mounted() {
    await this.loadTree()
    window.addEventListener('resize', this.onResize)
    // 默认展开第一个类 + 选第一个考点
    if (this.categories.length) {
      this.openCats[this.categories[0].category] = true
      const first = this.categories[0]._points[0]
      if (first) this.selectPoint(first.id)
    }
  },
  beforeUnmount() { window.removeEventListener('resize', this.onResize) },
  methods: {
    onResize() { this.isMobile = window.innerWidth < 768 },
    speak(t) { speakWord(t) },
    statusIcon(s) { return s === 'known' ? '✅' : s === 'unknown' ? '❌' : '⚪' },
    async loadTree() {
      const cats = await fetchGrammarCategories(this.userId)
      for (const c of cats) {
        c._points = await fetchGrammarCat(c.category, this.userId)
        this.openCats[c.category] = false
      }
      this.categories = cats
    },
    toggleCat(cat) { this.openCats[cat] = !this.openCats[cat] },
    async selectPoint(id) {
      this.selectedId = id
      this.loadingPoint = true; this.loadingQ = true; this.point = null; this.questions = []
      try {
        const [pt, qs] = await Promise.all([fetchGrammarPoint(id), fetchGrammarPractice(id)])
        this.point = pt
        this.questions = (qs || []).map(q => ({ ...q, _answered: false, _result: null }))
      } catch (e) { console.error(e) }
      finally { this.loadingPoint = false; this.loadingQ = false }
    },
    async markPoint(status) {
      await grammarProgress(this.userId, this.selectedId, status)
      // 更新左侧树状态
      for (const c of this.categories)
        for (const p of c._points)
          if (p.id === this.selectedId) p.status = status
    },
    async answerQ(q, optIdx) {
      if (q._answered) return
      const letter = 'ABCD'[optIdx]
      q._result = await grammarAnswer(this.userId, q.id, letter)
      q._answered = true
      // 更新易错本数 (左侧)
      if (!q._result.correct) {
        for (const c of this.categories)
          for (const p of c._points)
            if (p.id === this.selectedId) p.wrong = (p.wrong || 0) + 1
      }
    },
    optClass(q, i) {
      if (!q._answered) return ''
      const l = 'ABCD'[i]
      if (l === q._result.correctAnswer) return 'opt-ok'
      return 'opt-dim'
    },
    async startMixed() {
      this.selectedId = '__mixed__'
      this.point = { name: '🎲 随机混合练习', rule: '从全部 50 考点随机抽取 10 题，综合检验你的语法掌握。', formula: '', examples: [], pitfalls: [] }
      this.loadingQ = true
      try {
        const qs = await fetchGrammarMixed(10)
        this.questions = qs.map(q => ({ ...q, _answered: false, _result: null }))
      } catch (e) { console.error(e) }
      finally { this.loadingQ = false; this.loadingPoint = false }
    },
    async toggleDiag() {
      this.showDiag = !this.showDiag
      if (this.showDiag && !this.diagData.length) {
        try { this.diagData = await fetchGrammarDiagnosis(this.userId) } catch (e) {}
      }
    }
  }
}
</script>

<style scoped>
.gw-page { font-family: system-ui, -apple-system, "PingFang SC", sans-serif; }
.gw-topbar { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; background: #e3f2fd; flex-wrap: wrap; gap: 8px; }
.gw-topbar h2 { margin: 0; color: #1565c0; font-size: 18px; }
.gw-navs { display: flex; gap: 8px; }
.gw-nav { background: #fff; border: 1px solid #90caf9; color: #1565c0; padding: 6px 14px; border-radius: 8px; cursor: pointer; font-size: 13px; }
.gw-mobile-select { width: calc(100% - 40px); margin: 10px 20px; padding: 10px; border: 2px solid #90caf9; border-radius: 8px; font-size: 15px; }
.gw-layout { display: flex; gap: 0; min-height: calc(100vh - 60px); }
/* 左侧 */
.gw-sidebar { width: 260px; flex-shrink: 0; border-right: 1px solid #e0e0e0; overflow-y: auto; position: sticky; top: 0; max-height: 100vh; padding-bottom: 60px; }
.gw-tree { padding: 8px 0; }
.gw-cat { margin-bottom: 2px; }
.gw-cat-header { display: flex; align-items: center; gap: 6px; padding: 8px 14px; cursor: pointer; font-size: 14px; font-weight: 600; color: #333; }
.gw-cat-header:hover { background: #f5f5f5; }
.gw-arrow { width: 14px; color: #999; }
.gw-cat-progress { margin-left: auto; font-size: 12px; color: #999; font-weight: 400; }
.gw-points { }
.gw-point { display: flex; align-items: center; gap: 8px; padding: 7px 14px 7px 34px; cursor: pointer; font-size: 13px; color: #555; border-left: 3px solid transparent; }
.gw-point:hover { background: #e3f2fd; }
.gw-point.active { background: #bbdefb; border-left-color: #1565c0; color: #0d47a1; font-weight: 500; }
.gw-pstatus { font-size: 12px; }
.gw-pwrong { margin-left: auto; font-size: 11px; color: #ef5350; }
.gw-total { position: fixed; bottom: 0; width: 260px; padding: 10px 14px; background: #fff; border-top: 1px solid #e0e0e0; font-size: 13px; }
.gw-total b { color: #1565c0; font-size: 16px; }
/* 右侧 */
.gw-content { flex: 1; min-width: 0; padding: 20px 24px; max-width: 800px; }
.gw-empty { color: #aaa; padding: 60px 20px; text-align: center; }
.gw-loading { color: #888; padding: 30px; text-align: center; }
.gw-noq { color: #aaa; padding: 20px; text-align: center; font-size: 14px; }
/* 知识卡 */
.kp-card { background: #fff; border-radius: 14px; padding: 24px; margin-bottom: 20px; border: 1px solid #e0e0e0; }
.kp-title { font-size: 22px; font-weight: 700; color: #1565c0; margin-bottom: 16px; }
.kp-label { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
.kp-rule p { margin: 0 0 8px; font-size: 15px; line-height: 1.6; }
.kp-formula { font-size: 14px; background: #f5f5f5; padding: 8px 12px; border-radius: 6px; }
.kp-examples { margin-top: 16px; }
.kp-example { margin-bottom: 8px; }
.kp-ex-en { font-size: 15px; cursor: pointer; color: #333; }
.kp-ex-en:hover { color: #1565c0; }
.kp-ex-cn { display: block; font-size: 13px; color: #888; margin-top: 2px; }
.kp-pitfalls { margin-top: 16px; background: #fff8e1; padding: 12px 16px; border-radius: 8px; }
.kp-pitfalls ul { margin: 0; padding-left: 18px; }
.kp-pitfalls li { font-size: 14px; line-height: 1.6; margin-bottom: 4px; }
.kp-actions { display: flex; gap: 10px; margin-top: 16px; }
.btn-known, .btn-unknown { flex: 1; border: none; padding: 12px; border-radius: 10px; cursor: pointer; font-size: 15px; color: #fff; }
.btn-known { background: #4caf50; }
.btn-unknown { background: #ef5350; }
/* 练习题 */
.qp-title { font-size: 17px; font-weight: 600; margin-bottom: 12px; color: #333; }
.qp-card { background: #fff; border: 2px solid #e3f2fd; border-radius: 12px; padding: 20px; margin-bottom: 14px; }
.qp-card.answered { border-color: #c8e6c9; }
.qp-stem { font-size: 16px; line-height: 1.6; margin-bottom: 14px; }
.qp-options { display: flex; flex-direction: column; gap: 8px; }
.qp-opt { display: flex; align-items: center; gap: 10px; background: #f8f9fa; border: 2px solid #e0e0e0; border-radius: 10px; padding: 12px 16px; cursor: pointer; font-size: 15px; text-align: left; transition: all .1s; }
.qp-opt:hover:not(:disabled) { border-color: #90caf9; background: #e3f2fd; }
.qp-opt:disabled { cursor: default; }
.qp-letter { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #ddd; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.opt-ok { border-color: #4caf50 !important; background: #c8e6c9 !important; }
.opt-ok .qp-letter { background: #4caf50; color: #fff; }
.opt-dim { opacity: 0.4; }
/* 三段解析 */
.qp-explain { margin-top: 14px; }
.qp-result { text-align: center; font-size: 15px; font-weight: 600; padding: 10px; border-radius: 8px; margin-bottom: 10px; }
.qp-result.ok { background: #e8f5e9; color: #2e7d32; }
.qp-result.no { background: #fdecea; color: #c62828; }
.qp-ex-block { background: #f5f5f5; border-radius: 8px; padding: 12px 16px; margin-bottom: 6px; border-left: 3px solid #1565c0; }
.qp-ex-l { font-size: 13px; font-weight: 600; color: #1565c0; margin-bottom: 3px; }
.qp-ex-b { font-size: 14px; line-height: 1.5; color: #444; }
/* 过渡 */
.exslide-enter-active, .exslide-leave-active { transition: all .3s ease; overflow: hidden; }
.exslide-enter-from, .exslide-leave-to { opacity: 0; max-height: 0; }
.exslide-enter-to, .exslide-leave-from { opacity: 1; max-height: 500px; }
/* 弱项诊断 */
.diag-panel { background: #fff; border: 1px solid #e0e0e0; border-radius: 12px; padding: 16px 20px; margin: 0 20px 12px; max-width: 800px; }
.diag-empty { color: #888; padding: 20px; text-align: center; }
.diag-title { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #333; }
.diag-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f0f0f0; cursor: pointer; }
.diag-row:hover { background: #f5f5f5; }
.diag-rank { width: 24px; height: 24px; border-radius: 50%; background: #ef5350; color: #fff; font-size: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.diag-name { font-size: 14px; font-weight: 500; min-width: 140px; }
.diag-cat { font-size: 12px; color: #999; min-width: 80px; }
.diag-bar { flex: 1; height: 8px; background: #eee; border-radius: 4px; overflow: hidden; }
.diag-fill { height: 100%; background: #ef5350; transition: width .3s; }
.diag-count { font-size: 13px; color: #ef5350; font-weight: 500; min-width: 60px; text-align: right; }
.diag-hint { font-size: 12px; color: #aaa; margin-top: 8px; text-align: center; }
.diag-enter-active, .diag-leave-active { transition: all .3s ease; overflow: hidden; }
.diag-enter-from, .diag-leave-to { opacity: 0; max-height: 0; padding: 0; margin: 0; }
.diag-enter-to, .diag-leave-from { opacity: 1; max-height: 500px; }
/* 移动端 */
@media (max-width: 767px) {
  .gw-layout { flex-direction: column; }
  .gw-sidebar { display: none; }
  .gw-content { padding: 16px; }
}
</style>
