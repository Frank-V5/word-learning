<template>
  <div class="grammar-page">
    <div class="g-head"><button class="back" @click="$router.push('/grammar')">← 返回</button><h2>📕 语法易错本</h2></div>
    <p class="g-sub">没懂的考点累积，按错次排序。点进去重学。</p>
    <div v-if="loading" class="g-loading">加载中...</div>
    <div v-else-if="!troublesome.length" class="g-loading">✅ 暂无</div>
    <div v-else class="point-list">
      <div v-for="t in troublesome" :key="t.point_id" class="point-card unknown" @click="$router.push('/grammar/learn/' + t.point_id)">
        <span class="p-status">❌</span><span class="p-name">{{ t.name }} <span class="p-cat">({{ t.category }})</span></span>
        <span class="p-wrong">错{{ t.wrong_count }}</span>
      </div>
    </div>
  </div>
</template>
<script>
import { fetchGrammarTroublesome } from '../utils/grammar'
export default {
  name: 'GrammarTroublesome',
  data() { return { troublesome: [], loading: true, userId: localStorage.getItem('userId') } },
  async mounted() { try { this.troublesome = await fetchGrammarTroublesome(this.userId) } catch (e) {} finally { this.loading = false } }
}
</script>
<style scoped>
.grammar-page { padding: 24px; font-family: system-ui, -apple-system, "PingFang SC", sans-serif; max-width: 700px; margin: 0 auto; }
.g-head { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.g-head h2 { margin: 0; color: #e65100; }
.back { background: #eee; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.g-sub { color: #888; font-size: 13px; margin: 0 0 20px; }
.point-list { display: flex; flex-direction: column; gap: 8px; }
.point-card { display: flex; align-items: center; gap: 10px; background: #fdecea; border: 1px solid #ffcdd2; border-radius: 10px; padding: 14px 18px; cursor: pointer; }
.point-card:hover { border-color: #ef5350; }
.p-status { font-size: 18px; }
.p-name { flex: 1; font-size: 15px; }
.p-cat { color: #999; font-size: 12px; }
.p-wrong { font-size: 12px; color: #fff; background: #ef5350; padding: 3px 10px; border-radius: 10px; }
.g-loading { color: #888; padding: 30px; }
</style>
