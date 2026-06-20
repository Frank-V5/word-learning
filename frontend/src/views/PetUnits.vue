<template>
  <div class="pet-page">
    <h2>PET 备考 · 查漏补缺</h2>
    <p class="sub">把 PET 3085 词按"视频是否覆盖"分两组，重点攻「未覆盖」。翻卡「认识/不会」筛选真正不会的，不会的进 PET 错词本+易错表。</p>

    <div class="pet-actions">
      <button class="btn btn-secondary btn-small" @click="$router.push('/pet/review')">PET 错词本 ({{ reviewCount }})</button>
      <button class="btn btn-secondary btn-small" @click="$router.push('/pet/troublesome')">PET 易错表 ({{ troublesomeCount }})</button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>

    <template v-else>
      <section>
        <h3 class="grp-title covered">📚 PET·已覆盖（{{ groups.covered.length }} 单元 / 你视频学过的 {{ coveredTotal }} 词）</h3>
        <p class="grp-hint">这些 PET 词在小学/初中/高中视频里讲过，复习巩固即可。</p>
        <div class="unit-grid">
          <div v-for="u in groups.covered" :key="u.unit" class="unit-card covered" @click="go(u.unit)">
            <div class="unit-name">第 {{ u.idx }} 组</div>
            <div class="unit-range">{{ u.range }}</div>
            <div class="unit-stat">{{ u.total }} 词 · 已学 {{ u.known }}<span v-if="u.unknown"> · 🔴{{ u.unknown }}</span></div>
            <div class="bar"><div class="fill" :style="{ width: pct(u) + '%' }"></div></div>
          </div>
        </div>
      </section>

      <section>
        <h3 class="grp-title uncovered">🎯 PET·未覆盖（{{ groups.uncovered.length }} 单元 / 查漏补缺 {{ uncoveredTotal }} 词）</h3>
        <p class="grp-hint">视频没讲过的 PET 词，主攻这里。含一些常见词，认识的快速「认识」过，不会的重点背。</p>
        <div class="unit-grid">
          <div v-for="u in groups.uncovered" :key="u.unit" class="unit-card uncovered" @click="go(u.unit)">
            <div class="unit-name">第 {{ u.idx }} 组</div>
            <div class="unit-range">{{ u.range }}</div>
            <div class="unit-stat">{{ u.total }} 词 · 已学 {{ u.known }}<span v-if="u.unknown"> · 🔴{{ u.unknown }}</span></div>
            <div class="bar"><div class="fill" :style="{ width: pct(u) + '%' }"></div></div>
          </div>
        </div>
      </section>
    </template>
  </div>
</template>

<script>
import { fetchPetGroups, fetchPetReview, fetchPetTroublesome } from '../utils/pet'
export default {
  name: 'PetUnits',
  data() {
    return { groups: { covered: [], uncovered: [] }, reviewCount: 0, troublesomeCount: 0, loading: true,
             userId: localStorage.getItem('userId') }
  },
  computed: {
    coveredTotal() { return this.groups.covered.reduce((s, u) => s + u.total, 0) },
    uncoveredTotal() { return this.groups.uncovered.reduce((s, u) => s + u.total, 0) }
  },
  async mounted() {
    try {
      this.groups = await fetchPetGroups(this.userId)
      const [rv, tv] = await Promise.all([fetchPetReview(this.userId), fetchPetTroublesome(this.userId)])
      this.reviewCount = rv.length
      this.troublesomeCount = tv.length
    } catch (e) { console.error(e) } finally { this.loading = false }
  },
  methods: {
    go(unit) { this.$router.push(`/pet/learn/${unit}`) },
    pct(u) { return u.total ? Math.round(((u.known + u.unknown) / u.total) * 100) : 0 }
  }
}
</script>

<style scoped>
.pet-page { padding: 24px; font-family: system-ui, -apple-system, "PingFang SC", sans-serif; }
.sub { color: #666; font-size: 13px; margin-top: 0; }
.pet-actions { margin: 12px 0 20px; display: flex; gap: 8px; }
section { margin-bottom: 28px; }
.grp-title { margin: 0 0 2px; }
.grp-title.covered { color: #2e7d32; }
.grp-title.uncovered { color: #1565c0; }
.grp-hint { color: #888; font-size: 12px; margin: 0 0 12px; }
.unit-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 12px; }
.unit-card { background: #fff; border: 2px solid #eee; border-radius: 10px; padding: 12px; cursor: pointer; transition: transform .12s, box-shadow .12s; }
.unit-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,.1); }
.unit-card.covered { border-color: #c8e6c9; }
.unit-card.uncovered { border-color: #bbdefb; }
.unit-name { font-weight: 600; font-size: 15px; }
.unit-range { color: #888; font-size: 12px; }
.unit-stat { font-size: 12px; color: #555; margin: 4px 0; }
.bar { height: 5px; background: #eee; border-radius: 3px; overflow: hidden; }
.fill { height: 100%; background: #4caf50; transition: width .3s; }
.loading { color: #888; padding: 20px; }
</style>
