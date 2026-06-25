<template>
  <div class="grammar-page">
    <div class="g-head"><button class="back" @click="$router.push('/grammar')">← 返回</button><h2>{{ cat }}</h2></div>
    <div v-if="loading" class="g-loading">加载中...</div>
    <div v-else class="point-list">
      <div v-for="p in points" :key="p.id" class="point-card" :class="p.status" @click="$router.push('/grammar/learn/' + p.id)">
        <span class="p-status">{{ p.status === 'known' ? '✅' : p.status === 'unknown' ? '❌' : '⚪' }}</span>
        <span class="p-name">{{ p.name }}</span>
        <span class="p-wrong" v-if="p.wrong">错{{ p.wrong }}</span>
      </div>
    </div>
  </div>
</template>
<script>
import { fetchGrammarCat } from '../utils/grammar'
export default {
  name: 'GrammarCat',
  data() { return { points: [], loading: true, userId: localStorage.getItem('userId') } },
  computed: { cat() { return decodeURIComponent(this.$route.params.cat) } },
  async mounted() { await this.load() },
  watch: { '$route.params.cat'() { this.load() } },
  methods: {
    async load() {
      this.loading = true
      try { this.points = await fetchGrammarCat(this.cat, this.userId) } catch (e) { console.error(e) } finally { this.loading = false }
    }
  }
}
</script>
<style scoped>
.grammar-page { padding: 24px; font-family: system-ui, -apple-system, "PingFang SC", sans-serif; max-width: 700px; margin: 0 auto; }
.g-head { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.g-head h2 { margin: 0; color: #1565c0; }
.back { background: #eee; border: none; padding: 8px 14px; border-radius: 6px; cursor: pointer; }
.point-list { display: flex; flex-direction: column; gap: 8px; }
.point-card { display: flex; align-items: center; gap: 10px; background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 14px 18px; cursor: pointer; transition: border-color .12s; }
.point-card:hover { border-color: #90caf9; }
.point-card.known { background: #f1f8f1; }
.point-card.unknown { background: #fdecea; }
.p-status { font-size: 18px; }
.p-name { flex: 1; font-size: 15px; }
.p-wrong { font-size: 12px; color: #ef5350; background: #ffebee; padding: 2px 8px; border-radius: 10px; }
.g-loading { color: #888; padding: 30px; }
</style>
