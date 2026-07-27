/* ===================================================================
   data/stories.json 정적 검증 — CI 게이트 (.github/workflows/ci.yml)
   ===================================================================
   빌드 단계가 없는 정적 사이트라, 잘못된 데이터는 배포된 뒤 화면에서야 드러난다.
   여기서 "런처(js/app.js)가 실제로 소화할 수 있는 데이터인가"를 미리 확인한다.

   검증 기준(유형·학년·시간 모드)은 js/app.js의 상수에서 직접 읽어 온다(하드코딩 X).
   → app.js와 데이터가 따로 노는 상황을 잡는다.

   실행: node scripts/validate-data.mjs
   =================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const errors = [];
const warnings = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

// ── app.js에서 검증 기준 상수 추출 ────────────────────────────────
// 패턴을 못 찾으면 조용히 넘어가지 않고 실패시킨다(리팩터링으로 검증이 무력화되는 것 방지).
const APP = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf-8');

function extract(label, re, parse) {
  const m = APP.match(re);
  if (!m) {
    err(`js/app.js에서 ${label}를 찾지 못했습니다 — 상수 이름이 바뀌었다면 이 스크립트도 함께 고쳐야 합니다.`);
    return null;
  }
  return parse(m);
}

const TYPES = extract('TYPES', /var TYPES = \{([\s\S]*?)\n  \};/, (m) =>
  [...m[1].matchAll(/'([^']+)':\s*\{/g)].map((x) => x[1]));

const GRADES = extract('GRADES', /var GRADES = \{([\s\S]*?)\n  \};/, (m) =>
  [...m[1].matchAll(/^\s*(\w+):\s*\{/gm)].map((x) => x[1]));

const DURATIONS = extract('PLANS', /var PLANS = \{([\s\S]*?)\n  \};/, (m) =>
  [...m[1].matchAll(/^\s*(\d+):\s*\[/gm)].map((x) => Number(x[1])));

if (errors.length) {
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

// ── stories.json 로드 ────────────────────────────────────────────
const DATA_PATH = path.join(ROOT, 'data', 'stories.json');
let data;
try {
  data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
} catch (e) {
  console.error(`  ✗ data/stories.json 파싱 실패 — ${e.message}`);
  process.exit(1);
}

if (typeof data !== 'object' || data === null || Array.isArray(data)) {
  console.error('  ✗ data/stories.json 최상위는 { version, stories } 객체여야 합니다.');
  process.exit(1);
}
if (data.version === undefined) err('최상위 version 필드가 없습니다.');
if (!Array.isArray(data.stories) || data.stories.length === 0) {
  console.error('  ✗ stories 는 비어 있지 않은 배열이어야 합니다.');
  process.exit(1);
}

// ── 항목별 검증 ──────────────────────────────────────────────────
const STR_FIELDS = ['title', 'mainQuestion', 'hint'];
const ARR_FIELDS = ['story', 'followUpQuestions', 'teacherGuide', 'sampleIdeas', 'keywords'];
const REQUIRED = ['id', 'type', 'grades', 'durationOptions', 'sensitivity', ...STR_FIELDS, ...ARR_FIELDS];
const ALLOWED = new Set(REQUIRED);

// README 기준: 저학년 2~3문장, 중학년 3~5문장, 고학년 5~7문장 / 100~250자
const STORY_MIN_CHARS = 100;
const STORY_MAX_CHARS = 250;
const MID = (STORY_MIN_CHARS + STORY_MAX_CHARS) / 2;
const lengthOutliers = [];

const seenId = new Map();
const nonEmptyStr = (v) => typeof v === 'string' && v.trim() !== '';

data.stories.forEach((st, i) => {
  const where = `stories[${i}] (${st && st.id ? st.id : 'id 없음'})`;

  if (typeof st !== 'object' || st === null || Array.isArray(st)) {
    err(`${where}: 객체가 아닙니다.`);
    return;
  }

  for (const k of REQUIRED) {
    if (st[k] === undefined || st[k] === null) err(`${where}: 필수 필드 '${k}' 누락`);
  }
  for (const k of Object.keys(st)) {
    if (!ALLOWED.has(k)) err(`${where}: 알 수 없는 필드 '${k}'`);
  }

  if (!nonEmptyStr(st.id)) {
    err(`${where}: id 는 비어 있지 않은 문자열이어야 합니다.`);
  } else if (seenId.has(st.id)) {
    err(`${where}: id '${st.id}' 중복 (stories[${seenId.get(st.id)}]와 동일)`);
  } else {
    seenId.set(st.id, i);
  }

  for (const k of STR_FIELDS) {
    if (st[k] !== undefined && !nonEmptyStr(st[k])) err(`${where}: ${k} 가 비어 있습니다.`);
  }
  for (const k of ARR_FIELDS) {
    if (st[k] === undefined) continue;
    if (!Array.isArray(st[k]) || st[k].length === 0) {
      err(`${where}: ${k} 는 비어 있지 않은 배열이어야 합니다.`);
    } else if (!st[k].every(nonEmptyStr)) {
      err(`${where}: ${k} 에 빈 항목이 있습니다.`);
    }
  }

  // app.js는 TYPES[st.type] 을 그대로 조회한다 → 미등록 유형은 렌더링 시 터진다.
  if (!TYPES.includes(st.type)) {
    err(`${where}: 알 수 없는 유형 '${st.type}' (가능: ${TYPES.join(', ')})`);
  }

  if (!Array.isArray(st.grades) || st.grades.length === 0) {
    err(`${where}: grades 는 비어 있지 않은 배열이어야 합니다.`);
  } else {
    for (const g of st.grades) {
      if (!GRADES.includes(g)) err(`${where}: 알 수 없는 학년 '${g}' (가능: ${GRADES.join(', ')})`);
    }
    if (new Set(st.grades).size !== st.grades.length) err(`${where}: grades 에 중복 값이 있습니다.`);
  }

  // 시간 모드는 PLANS에 정의된 것만 화면에 존재한다 → 그 밖의 값은 아무도 고를 수 없다.
  if (!Array.isArray(st.durationOptions) || st.durationOptions.length === 0) {
    err(`${where}: durationOptions 는 비어 있지 않은 배열이어야 합니다.`);
  } else {
    for (const d of st.durationOptions) {
      if (!DURATIONS.includes(d)) {
        err(`${where}: 시간 모드 ${d}분은 app.js의 PLANS(${DURATIONS.join('·')}분)에 없습니다.`);
      }
    }
  }

  // app.js는 sensitivity !== 'low' 인 이야기를 목록에서 제외한다(README의 콘텐츠 안전 기준).
  // → 'low' 가 아니면 데이터에 있어도 학생에게 절대 노출되지 않는 죽은 항목이 된다.
  if (st.sensitivity !== 'low') {
    err(`${where}: sensitivity 는 'low' 여야 합니다 (현재 '${st.sensitivity}') — 그 외 값은 목록에서 제외됩니다.`);
  }

  // 분량은 가이드라인(경고) — 진행 시간 배분이 어긋나기 시작하는 신호로만 쓴다.
  if (Array.isArray(st.story) && st.story.every(nonEmptyStr)) {
    const chars = st.story.join('').length;
    if (chars < STORY_MIN_CHARS || chars > STORY_MAX_CHARS) {
      lengthOutliers.push({ id: st.id, chars });
    }
  }
});

// 편수가 많아 한 줄씩 찍으면 경고가 로그를 덮어 버린다 → 요약 + 가장 짧은 몇 편만 든다.
if (lengthOutliers.length) {
  const worst = [...lengthOutliers]
    .sort((a, b) => Math.abs(a.chars - MID) - Math.abs(b.chars - MID)).reverse()
    .slice(0, 5)
    .map((o) => `${o.id} ${o.chars}자`)
    .join(', ');
  warn(
    `본문 분량이 가이드라인(${STORY_MIN_CHARS}~${STORY_MAX_CHARS}자)을 벗어난 이야기 ` +
    `${lengthOutliers.length}편 / ${data.stories.length}편 — 편차가 큰 순: ${worst}`
  );
}

// ── 유형별 편수 ─────────────────────────────────────────────────
// 런처가 유형 5종을 나란히 보여 주므로, 한 유형만 비면 그 카드가 빈손이 된다.
{
  const byType = {};
  for (const st of data.stories) byType[st.type] = (byType[st.type] || 0) + 1;
  for (const t of TYPES) {
    if (!byType[t]) err(`유형 '${t}' 에 해당하는 이야기가 하나도 없습니다.`);
  }
}

// ── 결과 ─────────────────────────────────────────────────────────
for (const w of warnings) console.log(`  ⚠ ${w}`);
for (const e of errors) console.error(`  ✗ ${e}`);

if (errors.length) {
  console.error(`\n❌ 이야기 데이터 검증 실패 — 오류 ${errors.length}건`);
  process.exit(1);
}

console.log(`\n✅ 이야기 데이터 검증 통과 — ${data.stories.length}편${warnings.length ? ` (경고 ${warnings.length}건)` : ''}`);
