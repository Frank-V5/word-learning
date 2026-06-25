<template>
  <div class="vt-page">
    <div class="vt-head"><button class="back" @click="$router.push('/grammar/verbs')">← 返回</button><h2>📕 动词易错本 ({{ list.length }})</h2></div>
    <p class="hint">不会的动词累积，按错次排序，反复翻卡巩固。</p>
    <div v-if="loading" class="vt-loading">加载中...</div>
    <div v-else-if="!list.length" class="vt-loading">✅ 暂无</div>
    <div v-else class="vt-grid">
      <div v-for="c in list" :key="c.card_id" class="vt-card" :class="['tier'+c.tier,{flipped:c._f}]" @click="c._f=!c._f">
        <span class="vt-wc">错{{c.wrong_count}}</span>
        <template v-if="!c._f"><div class="vt-base" @click.stop="speak(c.base)">{{c.base}} 🔊</div><div class="vt-mn">{{c.meaning_zh}}</div></template>
        <template v-else><div class="vt-f">{{c.past}} / {{c.participle}}</div><div class="vt-mn">{{c.meaning_zh}}</div></template>
      </div>
    </div>
  </div>
</template>
<script>
import { speak as s } from '../utils/audio'
export default { name:'VerbTroublesome', data(){return{list:[],loading:true,userId:localStorage.getItem('userId')}},
  async mounted(){try{const r=await fetch(`/api/grammar/verb-troublesome?userId=${this.userId}`);this.list=(await r.json()).data.map(c=>({...c,_f:false}))}catch(e){}finally{this.loading=false}},
  methods:{speak:s} }
</script>
<style scoped>
.vt-page{padding:20px;font-family:system-ui,-apple-system,"PingFang SC",sans-serif;max-width:900px;margin:0 auto}
.vt-head{display:flex;align-items:center;gap:12px;margin-bottom:4px}.vt-head h2{margin:0;color:#e65100;font-size:18px}
.back{background:#eee;border:none;padding:8px 14px;border-radius:6px;cursor:pointer}
.hint{color:#888;font-size:13px;margin:0 0 16px}
.vt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.vt-card{position:relative;background:#fff;border-radius:10px;padding:16px 12px;min-height:90px;cursor:pointer;text-align:center}
.vt-card.tier1{border:2px solid #ffcdd2}.vt-card.tier2{border:2px solid #fff9c4}.vt-card.tier3{border:2px solid #c8e6c9}
.vt-wc{position:absolute;top:4px;right:6px;font-size:11px;color:#fff;background:#ef5350;padding:2px 6px;border-radius:8px}
.vt-base{font-size:18px;font-weight:700;cursor:pointer}.vt-f{font-size:16px;font-weight:600;color:#1565c0}
.vt-mn{font-size:13px;color:#888;margin-top:4px}
.vt-loading{color:#888;padding:30px;text-align:center}
</style>
