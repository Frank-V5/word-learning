<template>
  <div class="grammar-page">
    <div class="g-head">
      <h2>🔤 PET 语法训练</h2>
      <div class="g-navs">
        <button class="g-nav" @click="$router.push('/grammar/wrong')">📒 错题本 ({{ wrongCount }})</button>
        <button class="g-nav" @click="$router.push('/grammar/troublesome')">📕 易错本 ({{ troublesome }})</button>
      </div>
    </div>
    <p class="g-sub">B1 全 50 考点 · 看知识点 + 做选择 · 每题详细解析</p>
    <div v-if="loading" class="g-loading">加载中...</div>
    <template v-else>
      <div class="g-dash">已学 <b>{{ learned }}</b> / 50 考点</div>
      <div class="cat-grid">
        <div v-for="c in categories" :key="c.category" class="cat-card"
             @click="$router.push('/grammar/cat/' + encodeURIComponent(c.category))">
          <div class="cat-name">{{ c.category }}</div>
          <div class="cat-stat">{{ c.known || 0 }}/{{ c.total }} 已懂 <span v-if="c.unknown" class="unk">· ❌{{ c.unknown }}</span></div>
          <div class="cat-bar"><div class="cat-fill" :style="{ width: pct(c) + '%' }"></div></div>
        </div>
      </div>
    </template>
  </div>
</template>
<script>
import { fetchGrammarCategories, fetchGrammarTroublesome, fetchGrammarWrong } from '../utils/grammar'
export default {
  name: 'GrammarHome',
  data() { return { categories: [], troublesome: 0, wrongCount: 0, loading: true, userId: localStorage.getItem('userId') } },
  computed: { learned() { return this.categories.reduce((s, c) => s + (c.known || 0), 0) } },
  async mounted() {
    try {
      const [cats, tr, wr] = await Promise.all([fetchGrammarCategories(this.userId), fetchGrammarTroublesome(this.userId), fetchGrammarWrong(this.userId)])
      this.categories = cats; this.troublesome = tr.length; this.wrongCount = wr.length
    } catch (e) { console.error(e) } finally { this.loading = false }
  },
  methods: { pct(c) { return c.total ? Math.round(((c.known || 0) + (c.unknown || 0)) / c.total * 100) : 0 } }
}
</script>
<style scoped>
.grammar-page { padding: 24px; font-family: system-ui, -apple-system, "PingFang SC", sans-serif; max-width: 900px; margin: 0 auto; }
.g-head { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
.g-head h2 { margin: 0; color: #1565c0; }
.g-nav { background: #fff3e0; border: 1px solid #ffe0b2; color: #e65100; padding: 8px 14px; border-radius: 8px; cursor: pointer; font-size: 14px; }
.g-navs { display: flex; gap: 8px; }
.g-sub { color: #888; font-size: 13px; margin: 4px 0 20px; }
.g-dash { font-size: 16px; margin-bottom: 16px; }
.g-dash b { color: #1565c0; font-size: 22px; }
.cat-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
.cat-card { background: #fff; border: 2px solid #e3f2fd; border-radius: 12px; padding: 18px; cursor: pointer; transition: transform .12s, box-shadow .12s; }
.cat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, .1); }
.cat-name { font-size: 17px; font-weight: 600; color: #1565c0; }
.cat-stat { font-size: 13px; color: #666; margin: 6px 0; }
.unk { color: #ef5350; }
.cat-bar { height: 6px; background: #eee; border-radius: 3px; overflow: hidden; }
.cat-fill { height: 100%; background: #4caf50; transition: width .3s; }
.g-loading { color: #888; padding: 30px; }
</style>
