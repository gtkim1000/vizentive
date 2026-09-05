const { randomBytes, createHmac, timingSafeEqual } = require('node:crypto');

// Session token lifetime and client-side proactive-refresh window (see docs/PROJECT_HISTORY.md).
const TOKEN_TTL_SEC = 900; // 15 minutes
const REFRESH_WINDOW_SEC = 120; // /next re-issues a token when <2 min remain

// Response size caps — enforced server-side regardless of what a client requests.
const MAX_REC = 60;
const MAX_NET = 16;
const BOOTSTRAP_REC_COUNT = 60;
const BOOTSTRAP_NET_COUNT = 32;
const NEXT_DEFAULT_REC_COUNT = 40;
const NEXT_NET_COUNT = 24;

// Mirrors index.html's initialTorusCandidates count: 10 torusGroups total, 2 excluded
// ('원페이지 릴스','카드뉴스') by the client's own content-aware filter -> 8 eligible.
// This is a structural count only (no labels/content) kept in sync manually; the client
// bounds-checks the picked index against its real candidate count before using it, so a
// future content change here is a display-quality issue, not a correctness bug.
const ELIGIBLE_TORUS_CANDIDATE_COUNT = 8;

const SCATTER_KIND_COUNT = 7; // matches client SPATIAL_SCATTER_KINDS.length
const AXIS_INDEX = { X: 0, Y: 1, Z: 2 };

function send(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store, private');
  response.end(JSON.stringify(body));
}

function round(n, decimals) {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function signSession(secret) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { v: 1, sid: randomBytes(9).toString('base64url'), iat: now, exp: now + TOKEN_TTL_SEC };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(payloadB64).digest('base64url');
  return { token: `${payloadB64}.${sig}`, exp: payload.exp };
}

// Returns the verified payload on success, or null on any failure (missing/malformed/
// tampered/expired) — callers must not distinguish these cases in the response they send,
// to avoid handing back a forgery oracle.
function verifySession(secret, token) {
  if (typeof token !== 'string' || token.length > 512) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0 || dot === token.length - 1) return null;
  const payloadB64 = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = createHmac('sha256', secret).update(payloadB64).digest('base64url');
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || a.length === 0 || !timingSafeEqual(a, b)) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (!payload || typeof payload.exp !== 'number' || payload.exp <= now) return null;
  return payload;
}

// Validates a client-supplied count query param: undefined -> default; a non-digit string
// -> null (caller should respond 400); a valid number is clamped to [1, max], never rejected
// for being merely "too large" (per the cap-at-source requirement).
function clampCount(rawValue, def, max) {
  if (rawValue === undefined) return def;
  if (!/^\d{1,4}$/.test(String(rawValue))) return null;
  const n = Number(rawValue);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(max, n);
}

// --- Transition recipe generation (moved from index.html's randomScatterKind/pickPathStyle/
// fancySeed/tumbleSpinDesc/randomSpinDesc — see docs/PROJECT_HISTORY.md for the mapping). ---

// 2026-09-03: 'plain'(index 4, 밋밋한 직선 이동)을 완전히 제거 — 사용자 명시 요청("항상 다양한 효과로만
// 전환해줘, 단순 효과로 넘어가는 루틴은 빼줘"). 원래 4종(bounce/orbit/wave/loop)의 상대 비중(13:9:9:9)은
// 그대로 유지한 채 plain 몫(60%)만 나머지 4종에 비례 배분 — bounce 32.5%, orbit/wave/loop 각 22.5%.
function pickPathStyleIndex() {
  const r = Math.random();
  if (r < 0.325) return 0; // bounce
  if (r < 0.55) return 1; // orbit
  if (r < 0.775) return 2; // wave
  return 3; // loop
}

function randomSpin() {
  const r = Math.random();
  const axis = r < 0.4 ? 'Y' : r < 0.7 ? 'X' : 'Z';
  const hyper = axis === 'Y' && Math.random() < 0.25;
  const whirl = !hyper && Math.random() < 0.2;
  const mag = hyper ? 2400 + Math.random() * 1800 : whirl ? 900 + Math.random() * 720 : 140 + Math.random() * 260;
  return { axisIdx: AXIS_INDEX[axis], deg: round(mag * (Math.random() < 0.5 ? -1 : 1), 1) };
}

function tumbleSpin() {
  const r = Math.random();
  const axis = r < 0.4 ? 'Y' : r < 0.7 ? 'X' : 'Z';
  const deg = Math.random() < 0.16
    ? (1080 + Math.random() * 720) * (Math.random() < 0.5 ? -1 : 1)
    : Math.random() * 720 - 360;
  return { axisIdx: AXIS_INDEX[axis], deg: round(deg, 1) };
}

// Fixed-length tuple [k, p, s1, s2, s3, s4, s5]; unused trailing slots are 0.
function generateRecipe() {
  const k = Math.floor(Math.random() * SCATTER_KIND_COUNT);
  const p = pickPathStyleIndex();
  let s1 = 0, s2 = 0, s3 = 0, s4 = 0, s5 = 0;
  if (p === 0) { // bounce: bounces, amp, axis, deg
    const spin = randomSpin();
    s1 = 2 + Math.floor(Math.random() * 2);
    s2 = round(44 + Math.random() * 36, 1);
    s3 = spin.axisIdx;
    s4 = spin.deg;
  } else if (p === 1) { // orbit: radius, dir, axis, deg
    const spin = randomSpin();
    s1 = round(520 + Math.random() * 380, 1);
    s2 = Math.random() < 0.5 ? 1 : -1;
    s3 = spin.axisIdx;
    s4 = spin.deg;
  } else if (p === 2) { // wave: cycles, amp, dir, axis, deg
    const spin = randomSpin();
    s1 = 3 + Math.floor(Math.random() * 2);
    s2 = round(50 + Math.random() * 40, 1);
    s3 = Math.random() < 0.5 ? 1 : -1;
    s4 = spin.axisIdx;
    s5 = spin.deg;
  } else if (p === 3) { // loop: dir, axis, deg
    const spin = randomSpin();
    s1 = Math.random() < 0.5 ? 1 : -1;
    s2 = spin.axisIdx;
    s3 = spin.deg;
  } else { // plain: axis, deg
    const spin = tumbleSpin();
    s1 = spin.axisIdx;
    s2 = spin.deg;
  }
  return [k, p, s1, s2, s3, s4, s5];
}

function generateRecipes(count) {
  return Array.from({ length: count }, generateRecipe);
}

// --- Network node initial-physics jitter pool (moved from buildNetworkData's per-new-node
// Math.random() sub-expressions). Fixed-length tuple [radiusJitter, angleJitter, speedMag, tilt]. ---

function generateNetSlot() {
  return [
    round(Math.random() * 0.05, 4),
    round(Math.random() * 0.4, 4),
    round(0.0035 + Math.random() * 0.0035, 5),
    round((Math.random() - 0.5) * 1.1, 4),
  ];
}

function generateNetSlots(count) {
  return Array.from({ length: count }, generateNetSlot);
}

// Transition timing/threshold tuning — moved out of index.html's SPATIAL_SCATTER_OUT_MS
// const block. Literal values match the original hardcoded numbers exactly, so a client
// that never receives this still renders identically via its own built-in defaults.
function timingPolicy() {
  return { soMs: 1120, siMs: 1226, dist: 1700, bounceMs: 1300, autoTorusV: 0.12, autoNetV: 16 };
}

// 2026-09-05: 마스코트 의상 갈아입기(크럼블/조립 전환)에도 도넛/네트워크와 동일한 복제 방지 패턴을
// 적용 — 값 자체는 timingPolicy()처럼 비밀은 아니지만(수십 차례 튜닝된 "손맛" 상수일 뿐), 클라이언트는
// 이 응답을 실제로 받아야만(=서명된 세션 검증 통과) 전환 기능이 동작하도록 게이팅함(index.html의
// mascotVerified). 값은 index.html에 기존에 있던 하드코딩 상수와 정확히 동일 — 클라이언트가 이 응답을
// 못 받으면 기능 자체가(오류 없이 조용히) 아무 반응도 안 하는 것으로 확인됨(안전한 기본값으로 "그럭저럭
// 작동"하지 않도록 의도적으로 설계, 도넛의 spatialVerified와 동일한 원칙).
function mascotPolicy() {
  return { autoMs: 13000, liveCap: 260, tileBudget: 90, cellBudget: 20, scaleMax: 2.6, distMaxRatio: 0.85 };
}

// Scene hierarchy — moved out of index.html's `torusGroups` literal (portfolio grid, data
// wall, and the virtual-space hero all derive from this). References that used to point at
// the public `public/portfolio/ppt-manifest.js` values (pptRepresentatives/pptSequences) and
// the local mascotArts array are resolved here to plain numbers — none of these values were
// ever secret (the manifest file is already served publicly), this just centralizes them
// server-side so index.html no longer needs the raw hierarchy to reconstruct the scene.
function sceneHierarchy() {
  return [
    { art: 15, entryArt: 15, label: 'AI 모델', title: 'AI 모델', desc: '기획 의도와 모델 다양화, 마스코트를 함께 담은 인물형 AI 비주얼', direct: true, subgroups: [
      { label: 'AI 모델 다양화', title: 'AI 모델 다양화', arts: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19] },
      { label: '비젠티브 마스코트', title: '비젠티브 마스코트', arts: [98, 22] },
    ] },
    { art: 6, label: '뷰티 광고', title: '뷰티 광고', desc: '제품의 분위기와 효능을 감각적으로 보여주는 뷰티 광고 비주얼', direct: true, subgroups: [
      { label: '뷰티 광고', title: '뷰티 광고', arts: [6, 26, 27, 28, 107, 108, 109, 110] },
    ] },
    { art: 29, label: '수분크림', title: '수분크림', desc: '깊은 수분감과 청량한 사용감을 강조한 모이스처 크림 캠페인 비주얼', direct: true, subgroups: [
      { label: '수분크림', title: '수분크림', arts: [29, 30, 31, 32, 99, 100, 101, 102, 103, 104, 105, 106] },
    ] },
    { art: 23, label: '버블세럼', title: '버블세럼', desc: '말차 성분의 청량한 버블감과 수분 충전 효과를 강조한 세럼 캠페인 비주얼', direct: true, subgroups: [
      { label: '버블세럼', title: '버블세럼', arts: [23, 33, 34, 35, 36, 37, 38, 39] },
    ] },
    { art: 42, label: '헬스 광고', title: '헬스 광고', desc: '건강한 일상과 제품 메시지를 연결한 헬스 광고 비주얼', direct: true, subgroups: [
      { label: '헬스 광고', title: '헬스 광고', arts: [41, 42, 43, 44, 45, 46] },
    ] },
    { art: 50, label: '피트니스', title: '피트니스', desc: '움직임과 에너지를 강조한 피트니스 캠페인 비주얼', direct: true, subgroups: [
      { label: '피트니스', title: '피트니스', arts: [47, 48, 49, 50, 51] },
    ] },
    { art: 52, label: '스포티룩', title: '스포티룩', desc: '활동적이고 역동적인 인상을 담은 스포티 비주얼', direct: true, subgroups: [
      { label: '스포티룩', title: '스포티룩', arts: [52, 53, 54, 55] },
    ] },
    { art: 56, label: '아웃도어', title: '아웃도어', desc: '자연과 도전의 이미지를 살린 아웃도어 캠페인 비주얼', direct: true, subgroups: [
      { label: '아웃도어', title: '아웃도어', arts: [56, 57, 58, 59, 60, 61, 25, 62] },
    ] },
    { art: 63, label: '원페이지 릴스', title: '원페이지 릴스', desc: '생활습관과 건강 정보를 한 화면에 정리한 정보 콘텐츠', direct: true, subgroups: [
      { label: '대표 콘텐츠', title: '원페이지 릴스 대표 콘텐츠', arts: [63, 64, 65, 66, 67, 68, 69] },
      { label: '생활습관 · 건강상식', title: '생활습관 · 건강상식', arts: [70, 71, 72, 73, 74, 75] },
      { label: '건강식 · 건강정보', title: '건강식 · 건강정보', arts: [76, 77, 78, 79, 80, 81] },
    ] },
    { art: 87, label: '카드뉴스', title: '카드뉴스', desc: 'PPT 시리즈 순서에 맞춘 중년 여성 건강·영양 정보', direct: true, parentFirst: true, subgroups: [
      { label: '중년여성 몸신호 1', title: '중년여성 몸신호 1', arts: [87, 86, 85, 88] },
      { label: '중년여성 몸신호 2', title: '중년여성 몸신호 2', arts: [89, 90, 91, 92] },
      { label: '50대 영양제 1', title: '50대 영양제 1', arts: [84, 83, 82] },
      { label: '50대 영양제 2', title: '50대 영양제 2', arts: [93, 94, 95, 96] },
    ] },
  ];
}

module.exports = {
  TOKEN_TTL_SEC,
  REFRESH_WINDOW_SEC,
  MAX_REC,
  MAX_NET,
  BOOTSTRAP_REC_COUNT,
  BOOTSTRAP_NET_COUNT,
  NEXT_DEFAULT_REC_COUNT,
  NEXT_NET_COUNT,
  ELIGIBLE_TORUS_CANDIDATE_COUNT,
  send,
  signSession,
  verifySession,
  clampCount,
  generateRecipes,
  generateNetSlots,
  timingPolicy,
  mascotPolicy,
  sceneHierarchy,
};
