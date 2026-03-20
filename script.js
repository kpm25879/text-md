/* ============================================================
   MARKFORGE — script.js v4 (clean rewrite, working output)
   ============================================================ */
"use strict";

// ── DOM ───────────────────────────────────────────────────────
const inputText      = document.getElementById("inputText");
const outputText     = document.getElementById("outputText");
const outputDisplay  = document.getElementById("outputDisplay");
const outputPlaceholder = document.getElementById("outputPlaceholder");
const generateBtn    = document.getElementById("generateBtn");
const copyBtn        = document.getElementById("copyBtn");
const downloadBtn    = document.getElementById("downloadBtn");
const regenerateBtn  = document.getElementById("regenerateBtn");
const clearBtn       = document.getElementById("clearBtn");
const wordCountEl    = document.getElementById("wordCount");
const charCountEl    = document.getElementById("charCount");
const loadingOverlay = document.getElementById("loadingOverlay");
const loadingTextEl  = document.getElementById("loadingText");
const statsBar       = document.getElementById("statsBar");
const statCategoryVal= document.getElementById("statCategoryVal");
const statReadTimeVal= document.getElementById("statReadTimeVal");
const statTagsVal    = document.getElementById("statTagsVal");
const statViewsVal   = document.getElementById("statViewsVal");
const statSlugVal    = document.getElementById("statSlugVal");
const outputStats    = document.getElementById("outputStats");
const optFeatured    = document.getElementById("optFeatured");
const authorInput    = document.getElementById("authorInput");
const categoryGrid   = document.getElementById("categoryGrid");
const autoBadge      = document.getElementById("autoBadge");
const manualSlug     = document.getElementById("manualSlug");
const manualDesc     = document.getElementById("manualDesc");
const descCharCount  = document.getElementById("descCharCount");

// ── STATE ─────────────────────────────────────────────────────
let lastData         = null;
let selectedCategory = "auto";

// ── FIXED TAGS ────────────────────────────────────────────────
const FIXED_TAGS = [
  "free sex kahani","indian sex stories","hindi sex stories","desi kahani",
  "desi sex stories","desi sex kahani","antarvasna","kamvasna","xxxvasna",
  "desigaramkahani","hindi antarvasna","antarvasna hindi","sex kahani",
  "free hot sex stories","hindi chudai kahani","desi chudai stories",
  "hot hindi kahani","adult hindi stories","blue film kahani","hindi sexy kahani"
];

// ── DESC COUNTER ──────────────────────────────────────────────
manualDesc.addEventListener("input", () => {
  const len = manualDesc.value.length;
  descCharCount.textContent = len;
  const el = descCharCount.closest(".desc-counter");
  el.className = "desc-counter" + (len > 200 ? " over" : len > 160 ? " warn" : "");
});

// ── OVERRIDE CLEARS ───────────────────────────────────────────
document.querySelectorAll(".override-clear").forEach(btn => {
  btn.addEventListener("click", () => {
    const t = document.getElementById(btn.dataset.target);
    if (t) { t.value = ""; t.focus(); t.dispatchEvent(new Event("input")); }
  });
});

// ── CATEGORY SELECTOR ─────────────────────────────────────────
categoryGrid.addEventListener("click", e => {
  const btn = e.target.closest(".cat-btn");
  if (!btn) return;
  document.querySelectorAll(".cat-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  selectedCategory = btn.dataset.cat;
  autoBadge.textContent = selectedCategory === "auto" ? "AUTO" : "MANUAL";
  autoBadge.style.cssText = selectedCategory === "auto"
    ? "" : "background:rgba(0,229,160,0.1);color:var(--accent3);border-color:rgba(0,229,160,0.3)";
});

// ── WORD COUNTER ──────────────────────────────────────────────
inputText.addEventListener("input", () => {
  const txt = inputText.value;
  wordCountEl.textContent = txt.trim() ? txt.trim().split(/\s+/).length.toLocaleString() : "0";
  charCountEl.textContent = txt.length.toLocaleString();
});

// ── CLEAR ─────────────────────────────────────────────────────
clearBtn.addEventListener("click", () => {
  inputText.value = "";
  wordCountEl.textContent = "0";
  charCountEl.textContent = "0";
  inputText.focus();
  showToast("Input cleared", "info");
});

// ── GENERATE ──────────────────────────────────────────────────
generateBtn.addEventListener("click", async () => {
  const raw = inputText.value.trim();
  if (!raw)                         { showToast("Paste some text first!", "error"); return; }
  if (raw.split(/\s+/).length < 5)  { showToast("Text too short, paste more!", "error"); return; }
  await runGeneration(raw);
});

// ── REGENERATE VIEWS ──────────────────────────────────────────
regenerateBtn.addEventListener("click", () => {
  if (!lastData) return;
  lastData.views = generateRandomViews();
  const md = buildMarkdown(lastData);
  outputText.value = md;
  renderOutput(md);
  statViewsVal.textContent = lastData.views.toLocaleString();
  showToast("New views count generated!", "info");
});

// ── COPY ──────────────────────────────────────────────────────
copyBtn.addEventListener("click", async () => {
  if (!outputText.value) return;
  try {
    await navigator.clipboard.writeText(outputText.value);
  } catch {
    outputText.style.display = "block";
    outputText.select();
    document.execCommand("copy");
    outputText.style.display = "none";
  }
  showToast("Copied to clipboard!", "success");
  copyBtn.querySelector("span").textContent = "Copied!";
  setTimeout(() => { copyBtn.querySelector("span").textContent = "⎘ Copy"; }, 2000);
});

// ── DOWNLOAD ──────────────────────────────────────────────────
downloadBtn.addEventListener("click", () => {
  if (!outputText.value || !lastData) return;
  const blob = new Blob([outputText.value], { type: "text/markdown;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = lastData.slug + ".md";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Downloaded: " + lastData.slug + ".md", "success");
});

// ── MAIN FLOW ─────────────────────────────────────────────────
async function runGeneration(raw) {
  setLoading(true, "Analyzing content...");
  await delay(120);
  const cleaned = cleanText(raw);

  setLoading(true, "Extracting title...");
  await delay(150);
  const title = generateTitle(cleaned);

  setLoading(true, "Generating slug...");
  await delay(100);
  const slugRaw = manualSlug.value.trim();
  const slug    = slugRaw ? sanitizeSlug(slugRaw) : generateSlug(title);

  setLoading(true, "Detecting category...");
  await delay(120);
  const category    = selectedCategory !== "auto" ? selectedCategory : detectCategory(cleaned);
  const descRaw     = manualDesc.value.trim();
  const description = descRaw ? noQuotes(descRaw) : generateDescription(cleaned);
  const readTime    = calcReadTime(cleaned);
  const views       = generateRandomViews();
  const author      = noQuotes(authorInput.value.trim() || "Admin");
  const featured    = optFeatured.checked;
  const publishDate = todayDate();

  setLoading(true, "Formatting markdown...");
  await delay(120);

  lastData = { title, slug, description, author, category, tags: FIXED_TAGS, publishDate, readTime, featured, views, content: cleaned };
  const md = buildMarkdown(lastData);

  // Store in hidden textarea
  outputText.value = md;

  // Render to display div
  renderOutput(md);

  setLoading(false);

  // Show stats
  statCategoryVal.textContent = category;
  statReadTimeVal.textContent = readTime;
  statTagsVal.textContent     = FIXED_TAGS.length + " fixed tags";
  statViewsVal.textContent    = views.toLocaleString();
  statSlugVal.textContent     = slug;
  statsBar.classList.add("visible");
  outputStats.textContent     = cleaned.trim().split(/\s+/).length.toLocaleString() + " words";

  copyBtn.disabled = downloadBtn.disabled = regenerateBtn.disabled = false;
  showToast("Markdown generated!", "success");
}

// ── RENDER OUTPUT ─────────────────────────────────────────────
function renderOutput(md) {
  // Hide placeholder, show display
  outputPlaceholder.style.display = "none";
  outputDisplay.style.display = "block";
  outputDisplay.innerHTML = "";

  // Split frontmatter from body
  const match = md.match(/^---\n([\s\S]*?)\n---\n+([\s\S]*)$/);
  if (!match) {
    // No frontmatter — render as plain paragraphs
    renderBodyParagraphs(md, outputDisplay);
    return;
  }

  const fmRaw   = match[1];
  const bodyRaw = match[2];

  // ── Render frontmatter block ──
  const fmEl = document.createElement("div");
  fmEl.className = "fm-block";

  const addLine = (html) => {
    const s = document.createElement("span");
    s.className = "fm-row";
    s.innerHTML = html;
    fmEl.appendChild(s);
  };

  addLine('<span class="fm-dashes">---</span>');

  fmRaw.split("\n").forEach(line => {
    if (/^\s+-\s/.test(line)) {
      // tag list item
      const val = line.replace(/^\s+-\s/, "");
      addLine('<span class="fm-tag-item"><span class="fm-tag-bullet">  - </span><span class="fm-tag-val">' + esc(val) + '</span></span>');
    } else {
      const ci = line.indexOf(":");
      if (ci > -1) {
        const key = line.substring(0, ci);
        const val = line.substring(ci + 1);
        addLine('<span class="fm-key">' + esc(key) + '</span><span class="fm-colon">:</span><span class="fm-val">' + esc(val) + '</span>');
      } else {
        addLine(esc(line));
      }
    }
  });

  addLine('<span class="fm-dashes">---</span>');
  outputDisplay.appendChild(fmEl);

  // ── Render body ──
  const bodyEl = document.createElement("div");
  bodyEl.className = "content-body";
  renderBodyParagraphs(bodyRaw, bodyEl);
  outputDisplay.appendChild(bodyEl);
}

function renderBodyParagraphs(text, container) {
  const blocks = text.split(/\n{2,}/);
  blocks.forEach(block => {
    block = block.trim();
    if (!block) return;
    const el = document.createElement("span");
    if (/^#{1,6}\s/.test(block)) {
      el.className = "content-heading";
      el.textContent = block.replace(/^#{1,6}\s/, "");
    } else {
      el.className = "content-para";
      el.textContent = block;
    }
    container.appendChild(el);
  });
}

function esc(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// ── UTILS ─────────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function todayDate() { return new Date().toISOString().split("T")[0]; }
function noQuotes(s) { return String(s).replace(/["']/g, ""); }

function setLoading(show, msg) {
  if (show) {
    loadingTextEl.textContent = msg || "Processing...";
    loadingOverlay.classList.add("visible");
    generateBtn.classList.add("loading");
    generateBtn.disabled = true;
  } else {
    loadingOverlay.classList.remove("visible");
    generateBtn.classList.remove("loading");
    generateBtn.disabled = false;
  }
}

let _toastTimer = null;
function showToast(msg, type) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.className = "toast " + (type || "info") + " show";
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}

// ============================================================
// TEXT PROCESSING
// ============================================================

function cleanText(text) {
  let t = text
    .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
    .replace(/&quot;/g,"").replace(/&#39;/g,"").replace(/&nbsp;/g," ");
  t = t.replace(/\r\n/g,"\n").replace(/\r/g,"\n");
  t = t.replace(/[\u200B-\u200D\uFEFF]/g,"");
  // Fix spaces within lines but NOT newlines
  t = t.replace(/[^\S\n]+/g," ");
  // Normalise 3+ newlines to exactly 2 (paragraph break)
  t = t.replace(/\n{3,}/g,"\n\n");
  // Trim each line but KEEP the newline structure intact
  t = t.split("\n").map(l => l.trim()).join("\n");
  // Re-ensure paragraph breaks are double newlines (in case trim collapsed them)
  t = t.replace(/\n{3,}/g,"\n\n");
  return t.trim();
}

function generateTitle(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    const c = line.replace(/^[#\-*>\s]+/, "").trim();
    if (c.length > 3 && c.length < 90 && !c.endsWith("."))
      return capTitle(noQuotes(c));
  }
  const s = ((lines[0] || "").match(/[^.!?]+[.!?]*/) || [])[0];
  if (s && s.length > 5 && s.length < 90) return capTitle(noQuotes(s.replace(/[.!?]+$/, "")));
  return capTitle(noQuotes((lines[0] || "").substring(0, 60)));
}

function capTitle(str) {
  const minor = new Set(["a","an","the","and","but","or","for","nor","on","at","to",
    "by","in","of","up","as","ka","ki","ke","ne","se","ko","hai","tha","thi","aur","ya","jo","jab","tab","ek"]);
  return str.replace(/[_\-]+/g," ").split(" ").map((w,i) => {
    const low = w.toLowerCase();
    return (i===0 || !minor.has(low)) ? w.charAt(0).toUpperCase()+w.slice(1) : low;
  }).join(" ").trim();
}

// ── HINDI TRANSLITERATION ─────────────────────────────────────
const HW = {
  "शादी":"shaadi","प्यार":"pyaar","लड़की":"ladki","लड़का":"ladka","मोहब्बत":"mohabbat",
  "दिल":"dil","जिंदगी":"zindagi","यार":"yaar","दोस्त":"dost","घर":"ghar",
  "परिवार":"parivaar","माँ":"maa","बाप":"baap","भाई":"bhai","बहन":"behen",
  "पति":"pati","पत्नी":"patni","कहानी":"kahani","किस्सा":"kissa","बात":"baat",
  "रात":"raat","दिन":"din","सपना":"sapna","इश्क":"ishq","दर्द":"dard",
  "खुशी":"khushi","याद":"yaad","रिश्ता":"rishta","देश":"desh","गाँव":"gaanv",
  "शहर":"sheher","सफर":"safar","मंजिल":"manzil",
};
const HM = {
  "अ":"a","आ":"aa","इ":"i","ई":"ee","उ":"u","ऊ":"oo","ए":"e","ऐ":"ai","ओ":"o","औ":"au",
  "ा":"aa","ि":"i","ी":"ee","ु":"u","ू":"oo","े":"e","ै":"ai","ो":"o","ौ":"au","ं":"n","ः":"h","्":"",
  "क":"k","ख":"kh","ग":"g","घ":"gh","च":"ch","छ":"chh","ज":"j","झ":"jh",
  "ट":"t","ठ":"th","ड":"d","ढ":"dh","ण":"n","त":"t","थ":"th","द":"d","ध":"dh","न":"n",
  "प":"p","फ":"f","ब":"b","भ":"bh","म":"m","य":"y","र":"r","ल":"l","व":"v",
  "श":"sh","ष":"sh","स":"s","ह":"h","ड़":"d","ढ़":"dh","ज़":"z","फ़":"f",
  "ङ":"ng","ञ":"ny","ऋ":"ri","ृ":"ri",
  "०":"0","१":"1","२":"2","३":"3","४":"4","५":"5","६":"6","७":"7","८":"8","९":"9","।":".",
};

function transliterate(text) {
  if (!text) return text;
  let r = text;
  for (const [h,e] of Object.entries(HW)) r = r.replace(new RegExp(h,"g"), e);
  let out = "";
  for (const ch of r) out += (HM[ch] !== undefined) ? HM[ch] : ch;
  return out;
}

function sanitizeSlug(raw) {
  let s = raw.toLowerCase()
    .replace(/&/g,"and").replace(/[^\w\s-]/g,"")
    .replace(/[\s_]+/g,"-").replace(/-{2,}/g,"-")
    .replace(/^-+|-+$/g,"");
  if (s.length > 70) s = s.substring(0,70).replace(/-[^-]*$/,"");
  return s || "untitled-post";
}

function generateSlug(title) {
  return sanitizeSlug(transliterate(title));
}

function generateDescription(text) {
  let plain = text.replace(/[#*_`>~\-]+/g," ").replace(/\s+/g," ").trim();
  const paras = plain.split(/\n+/).map(p=>p.trim()).filter(p=>p.length>40);
  const src = (paras[0]||plain).replace(/\s+/g," ");
  let d = src.substring(0,190);
  const lp = Math.max(d.lastIndexOf("."),d.lastIndexOf("!"),d.lastIndexOf("?"),d.lastIndexOf("।"));
  if (lp > 100) d = d.substring(0,lp+1);
  else if (d.length > 160) d = d.substring(0,160).replace(/\s+\S*$/,"")+"...";
  d = noQuotes(transliterate(d)).trim();
  return d.charAt(0).toUpperCase()+d.slice(1);
}

function detectCategory(text) {
  const t = text.toLowerCase();
  const S = {
    "ऑफिस में चुदाई"          : ["office","boss","colleague","cabin","company","naukri"],
    "रंडी की चुदाई"            : ["randi","call girl","paisa","tawaif","customer"],
    "पड़ोस में चुदाई"          : ["padosi","neighbor","neighbour","colony","flat","pados"],
    "सील तोड़ चुदाई"           : ["pahli baar","virgin","first time","seal","pehli","shuru"],
    "लड़कियों की गांड़ चुदाई"  : ["gaand","anal","gand","peeche"],
    "गे चुदाई"                 : ["gay","homosexual","dono ladke","mard mard"],
    "बुआ की चुदाई"             : ["bua","buaji"],
    "ग्रुप में चुदाई"          : ["group","gang","milke","sab ne","teen char"],
    "अदला बदली"                : ["exchange","swap","adla badli","wife swap"],
    "लेस्बियन चुदाई"           : ["lesbian","ladki ladki","dono ladkiyan","saheli"],
    "नौकर नौकरानी चुदाई"       : ["naukar","naukrani","servant","maid","kaam wali","bai"],
    "अजनबी की चुदाई"           : ["ajnabi","stranger","unknown","train","bus"],
    "भाभी की चुदाई"            : ["bhabhi","bhabhiji","bhai ki biwi"],
    "नजदीकी रिश्तों में चुदाई" : ["sasur","sasurji","bahu","baap beti","papa beti","bhai bahan","brother sister","maa","mummy","chachi","mami","mausi","bua","jija","sali"],
    "चाची की चुदाई"            : ["chachi","chachiji"],
    "मामी की चुदाई"            : ["mami","mamiji"],
    "मौसी की चुदाई"            : ["mausi","mausiji"],
    "आंटी की चुदाई"            : ["aunty","auntie","aanti","anti"],
    "भाई बहन की चुदाई"         : ["bhai bahan","brother sister"],
    "ससुर बहू की चुदाई"        : ["sasur","sasurji","bahu","father in law"],
    "बाप बेटी की चुदाई"        : ["baap beti","papa beti","father daughter"],
    "माँ की चुदाई"             : ["maa","mummy","mom","mother"],
    "बीवी की चुदाई"            : ["biwi","wife","ghar wali","patni"],
    "जीजा साली की चुदाई"       : ["jija","sali","jijaji"],
    "गर्लफ्रेंड की चुदाई"      : ["girlfriend","gf","lover","dating"],
    "हॉट सेक्स स्टोरी"         : ["hot","sexy","wild","intense","passionate"],
    "चुदाई की कहानी"           : ["kahani","story","kissa","anubhav"],
  };
  const scores = {};
  for (const [cat,words] of Object.entries(S))
    scores[cat] = words.reduce((s,w)=>s+(t.includes(w)?1:0),0);
  const best = Object.entries(scores).sort((a,b)=>b[1]-a[1])[0];
  return (best && best[1]>0) ? best[0] : "चुदाई की कहानी";
}

function calcReadTime(text) {
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 200)) + " min read";
}

function generateRandomViews() {
  const r = Math.random();
  let v;
  if (r < 0.5)      v = Math.floor(Math.random()*(300000-150000+1))+150000;
  else if (r < 0.8) v = Math.floor(Math.random()*(550000-300001+1))+300001;
  else               v = Math.floor(Math.random()*(900000-550001+1))+550001;
  return v + Math.floor(Math.random()*999);
}

// ── SMART PARAGRAPH FORMATTER ─────────────────────────────────
function formatContent(text, title) {
  // Remove duplicated title at top
  let body = text.trim();
  const fl = body.split("\n")[0].trim().replace(/^[#\s]+/,"");
  if (fl && title.toLowerCase().startsWith(fl.toLowerCase().substring(0,15)))
    body = body.split("\n").slice(1).join("\n").trim();

  body = body.replace(/\r\n/g,"\n").replace(/\r/g,"\n");

  const rawLines = body.split("\n");
  const nonEmpty = rawLines.filter(l=>l.trim());
  const totalWords = nonEmpty.reduce((s,l)=>s+l.trim().split(/\s+/).length,0);
  const avgWords = totalWords / Math.max(nonEmpty.length,1);
  const enderRatio = nonEmpty.filter(l=>/[.!?।…]$/.test(l.trim())).length / Math.max(nonEmpty.length,1);
  const blankLines = rawLines.filter(l=>!l.trim()).length;
  const hasParagraphBreaks = blankLines >= 1;

  let paragraphs;
  if (!hasParagraphBreaks && nonEmpty.length <= 3 && avgWords > 30) {
    paragraphs = splitWall(body);
  } else if (!hasParagraphBreaks && enderRatio > 0.55 && avgWords < 22) {
    paragraphs = groupDense(rawLines);
  } else if (hasParagraphBreaks) {
    paragraphs = parseNormal(rawLines);
  } else {
    paragraphs = splitWall(body);
  }

  // ── NUCLEAR FALLBACK: guarantee at least 2 paragraphs for any text > 60 words ──
  if (paragraphs.length < 2 && totalWords > 60) {
    paragraphs = splitWall(body);
  }
  // If splitWall also returned 1 paragraph, force-split the text at midpoint sentence boundary
  if (paragraphs.length < 2 && totalWords > 60) {
    paragraphs = forceSplitAtMidpoint(body);
  }

  const ENDERS = /[.!?।…]$/;
  const output = [];
  paragraphs.forEach((para, idx) => {
    para = para.trim();
    if (!para) return;
    if (/^#{1,6}\s/.test(para)) { output.push(para); return; }
    // Only promote to heading if it ends with ":" OR is ≤4 words with no sentence punctuation
    const wordCount = para.split(/\s+/).length;
    if (idx > 0 && para.split("\n").length === 1 && para.length < 60
        && wordCount <= 6 && !ENDERS.test(para)
        && (/:\s*$/.test(para) || wordCount <= 4)) {
      output.push("## " + para.replace(/:$/,""));
      return;
    }
    const joined = para.split("\n").map(l=>l.trim()).filter(Boolean).join(" ");
    output.push(joined);
  });

  // Final guaranteed double-newline join — this IS the \n\n between paragraphs
  return output.filter(Boolean).join("\n\n").trim();
}

function splitWall(text) {
  // Split on sentence-ending punctuation — safe, no lookbehind
  const parts = text.split(/([.!?।…])\s+/);
  const sentences = [];
  for (let i = 0; i < parts.length; i += 2) {
    const s = (parts[i] || "").trim() + (parts[i + 1] || "");
    if (s.trim()) sentences.push(s.trim());
  }
  // If we still got just 1 "sentence", split on any whitespace run ≥2
  if (sentences.length < 2) {
    const words = text.trim().split(/\s+/);
    if (words.length >= 2) {
      const mid = Math.ceil(words.length / 4);
      const rebuilt = [];
      for (let i = 0; i < words.length; i += mid)
        rebuilt.push(words.slice(i, i + mid).join(" "));
      return rebuilt.filter(Boolean);
    }
    return [text.trim()];
  }
  const PSIZE = 4;
  const groups = [];
  for (let i = 0; i < sentences.length; i += PSIZE)
    groups.push(sentences.slice(i, i + PSIZE).join(" "));
  return groups;
}

// Nuclear fallback: if all else fails, split text at sentence boundaries near midpoint
function forceSplitAtMidpoint(text) {
  const words = text.trim().split(/\s+/);
  if (words.length < 8) return [text.trim()];
  const PSIZE = Math.max(4, Math.ceil(words.length / 5));
  const groups = [];
  for (let i = 0; i < words.length; i += PSIZE)
    groups.push(words.slice(i, i + PSIZE).join(" "));
  return groups.filter(Boolean);
}

function groupDense(lines) {
  const PSIZE = 4;
  const sentences = [];
  let buf = "";
  lines.forEach(line => {
    const t = line.trim();
    if (!t) { if(buf){sentences.push({text:buf.trim(),brk:true});buf="";} return; }
    if (/^#{1,6}\s/.test(t)) { if(buf){sentences.push({text:buf.trim(),brk:false});buf="";} sentences.push({text:t,h:true}); return; }
    buf += (buf?" ":"")+t;
    if (/[.!?।…]$/.test(t)) { sentences.push({text:buf.trim(),brk:false}); buf=""; }
  });
  if (buf) sentences.push({text:buf.trim(),brk:false});
  const out = []; let grp = [];
  sentences.forEach(item => {
    if (item.h)   { if(grp.length){out.push(grp.join(" "));grp=[];} out.push(item.text); return; }
    if (item.brk) { if(grp.length){out.push(grp.join(" "));grp=[];} if(item.text)grp.push(item.text); return; }
    grp.push(item.text);
    if (grp.length>=PSIZE) { out.push(grp.join(" ")); grp=[]; }
  });
  if (grp.length) out.push(grp.join(" "));
  return out;
}

function parseNormal(lines) {
  const out=[]; let cur=[];
  lines.forEach(line => {
    if (!line.trim()) { if(cur.length){out.push(cur.join(" "));cur=[];} }
    else cur.push(line.trim());
  });
  if (cur.length) out.push(cur.join(" "));
  return out;
}

// ── BUILD MARKDOWN (no quotes anywhere in values) ────────────
function buildMarkdown(d) {
  const title       = noQuotes(d.title);
  const slug        = noQuotes(d.slug);
  const description = noQuotes(d.description);
  const author      = noQuotes(d.author);
  const category    = noQuotes(d.category);
  const readTime    = noQuotes(d.readTime);
  const date        = noQuotes(d.publishDate);
  const tagsYaml    = d.tags.map(t => "  - " + noQuotes(t)).join("\n");
  const body        = formatContent(d.content, d.title);

  return "---\n" +
    "title: " + title + "\n" +
    "slug: " + slug + "\n" +
    "description: " + description + "\n" +
    "author: " + author + "\n" +
    "category: " + category + "\n" +
    "tags:\n" + tagsYaml + "\n" +
    "publishDate: " + date + "\n" +
    "readTime: " + readTime + "\n" +
    "featured: " + (d.featured ? "true" : "false") + "\n" +
    "views: " + d.views + "\n" +
    "---\n\n" +
    body;
}

// ── KEYBOARD SHORTCUTS ────────────────────────────────────────
document.addEventListener("keydown", e => {
  if ((e.ctrlKey||e.metaKey) && e.key==="Enter") { e.preventDefault(); generateBtn.click(); }
  if ((e.ctrlKey||e.metaKey) && e.shiftKey && e.key==="C") { e.preventDefault(); if(!copyBtn.disabled) copyBtn.click(); }
});

// ── INIT ──────────────────────────────────────────────────────
inputText.dispatchEvent(new Event("input"));
inputText.addEventListener("focus", () => {
  setTimeout(() => showToast("Ctrl+Enter to generate quickly", "info"), 800);
}, { once: true });
