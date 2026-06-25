<template>
  <div class="pt-page">
    <div class="pt-head"><button class="back" @click="$router.push('/grammar/phrases')">← 返回</button><h2>📕 搭配易错本 ({{ list.length }})</h2></div>
    <p class="hint">不会的搭配累积，按错次排序，反复翻卡巩固。</p>
    <div v-if="loading" class="pt-loading">加载中...</div>
    <div v-else-if="!list.length" class="pt-loading">✅ 暂无</div>
    <div v-else class="pt-grid">
      <div v-for="c in list" :key="c.card_id" class="pt-card" :class="{flipped:c._f}" @click="c._f=!c._f">
        <span class="pt-wc">错{{c.wrong_count}}</span>
        <template v-if="!c._f"><div class="pt-phrase" @click.stop="speak(c.phrase)">{{c.phrase}} 🔊</div></template>
        <template v-else><div class="pt-meaning">{{c.meaning_zh}}</div><div class="pt-note">💡 {{c.note}}</div></template>
      </div>
    </div>
  </div>
</template>
<script>
import { speak as s } from '../utils/audio'
export default { name:'PhraseTroublesome', data(){return{list:[],loading:true,userId:localStorage.getItem('userId')}},
  async mounted(){try{const r=await fetch(`/api/grammar/phrase-troublesome?userId=${this.userId}`);this.list=(await r.json()).data.map(c=>({...c,_f:false}))}catch(e){}finally{this.loading=false}},
  methods:{speak:s} }
</script>
<style scoped>
.pt-page{padding:20px;font-family:system-ui,-apple-system,"PingFang SC",sans-serif;max-width:900px;margin:0 auto}
.pt-head{display:flex;align-items:center;gap:12px;margin-bottom:4px}.pt-head h2{margin:0;color:#e65100;font-size:18px}
.back{background:#eee;border:none;padding:8px 14px;border-radius:6px;cursor:pointer}
.hint{color:#888;font-size:13px;margin:0 0 16px}
.pt-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px}
.pt-card{position:relative;background:#fff;border:2px solid #ffe0b2;border-radius:10px;padding:16px 12px;min-height:80px;cursor:pointer;text-align:center}
.pt-card.flipped{background:#fff8e1}
.pt-wc{position:absolute;top:4px;right:6px;font-size:11px;color:#fff;background:#ef5350;padding:2px 6px;border-radius:8px}
.pt-phrase{font-size:16px;font-weight:600;cursor:pointer}
.pt-meaning{font-size:16px;font-weight:600;color:#333;margin-bottom:4px}
.pt-note{font-size:12px;color:#1565c0}
.pt-loading{color:#888;padding:30px;text-align:center}
</style>
