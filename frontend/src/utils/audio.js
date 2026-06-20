// 单词发音工具
// 优先播放服务端预生成的静态音频 (Cambridge 真人录音 / edge-tts 神经合成),
// 文件缺失(404)或解码失败时回退浏览器内置 TTS (speechSynthesis), 保证永不哑火。
//
// 音频 URL 规则必须与生成端 enrich.py 的 hash_path() 完全一致:
//   /audio/pron/<sha1(normKey(word)+':'+accent)[:2]>/<sha1>.mp3
// 用纯 JS SHA-1 (不依赖 crypto.subtle, 因站点为 HTTP 非安全上下文)。

// ---------- 纯 JS SHA-1 (UTF-8 字符串 -> hex) ----------
function rotL(n, s) { return (n << s) | (n >>> (32 - s)); }

export function sha1hex(str) {
  const bytes = new TextEncoder().encode(str);
  const len = bytes.length;
  const bitLen = len * 8;
  const totalLen = (((len + 1 + 63) >> 6) << 6);          // 补齐到 64 字节倍数
  const buf = new Uint8Array(totalLen);
  buf.set(bytes);
  buf[len] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(totalLen - 4, bitLen >>> 0, false);
  dv.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);

  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
  const w = new Uint32Array(80);
  for (let i = 0; i < totalLen; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = dv.getUint32(i + j * 4, false);
    for (let j = 16; j < 80; j++) w[j] = rotL(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let j = 0; j < 80; j++) {
      let f, k;
      if (j < 20)      { f = (b & c) | (~b & d);              k = 0x5A827999; }
      else if (j < 40) { f = b ^ c ^ d;                        k = 0x6ED9EBA1; }
      else if (j < 60) { f = (b & c) | (b & d) | (c & d);      k = 0x8F1BBCDC; }
      else             { f = b ^ c ^ d;                        k = 0xCA62C1D6; }
      const t = (rotL(a, 5) + f + e + k + (w[j] >>> 0)) >>> 0;
      e = d; d = c; c = rotL(b, 30); b = a; a = t;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  return [h0, h1, h2, h3, h4].map(x => x.toString(16).padStart(8, '0')).join('');
}

// ---------- 发音 ----------
const ACCENT = 'us';
let _el = null;

function normKey(t) {
  return String(t).toLowerCase().replace(/\s+/g, ' ').trim();
}

function audioUrl(text, accent) {
  const h = sha1hex(normKey(text) + ':' + accent);
  return `/audio/pron/${h.slice(0, 2)}/${h}.mp3`;
}

function ttsFallback(text, accent) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = accent === 'uk' ? 'en-GB' : 'en-US';
  u.rate = 0.8;
  window.speechSynthesis.speak(u);
}

export function speak(text, accent = ACCENT) {
  if (!text) return;
  if (!_el) _el = new Audio();
  let fell = false;
  const fallback = () => { if (!fell) { fell = true; ttsFallback(text, accent); } };
  _el.onerror = fallback;
  _el.onended = null;
  _el.src = audioUrl(text, accent);
  _el.load();
  const p = _el.play();
  if (p && p.catch) p.catch(fallback);
}
