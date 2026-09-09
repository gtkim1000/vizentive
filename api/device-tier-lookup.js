// C안: 로컬 화이트리스트(index.html KNOWN_DEVICE_GPU_TIERS)에 없는 GPU 렌더러 문자열을 방문자
// 부팅 이후 백그라운드에서 조회 — 절대 부팅을 막지 않고, 결과가 오면 업그레이드만 함(다운그레이드
// 없음, 기존 runBackgroundDeviceBench와 동일 원칙). 2026-09-09.
const { send } = require('./spatial/_lib');

// index.html의 AnTuTu11 선형추정 공식과 반드시 동일하게 유지 — 앵커: S9+=611930(tier0),
// S23+=1695011(tier5, antutu.com 공식 랭킹, 2026-09-09 정정값). 공식을 바꾸면 여기도 같이 바꿀 것.
const ANCHOR_LOW = 611930;
const ANCHOR_HIGH = 1695011;
const STEP = (ANCHOR_HIGH - ANCHOR_LOW) / 5;
function tierFromScore(score) {
  const raw = Math.ceil((score - ANCHOR_LOW) / STEP);
  return Math.max(0, Math.min(5, raw));
}

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return send(response, 405, { error: 'Method not allowed' });
  }

  const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
  const gpu = (url.searchParams.get('gpu') || '').trim().slice(0, 300);
  if (!gpu) return send(response, 400, { error: 'gpu query param required' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  // 설정 미비/DB 오류는 전부 조용히 tier:null로 응답 — 이 엔드포인트는 순수 업그레이드 보조 경로라,
  // 실패해도 방문자가 이미 로컬로 부팅된 화면엔 영향이 없어야 함(에러를 던지지 않음).
  if (!supabaseUrl || !secretKey) return send(response, 200, { tier: null });

  try {
    const db = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/benchmark_android_antutu?select=device,total_score,gpu_pattern&gpu_pattern=not.is.null`,
      { headers: { apikey: secretKey } },
    );
    if (!db.ok) return send(response, 200, { tier: null });

    const rows = await db.json();
    let best = null;
    for (const row of rows) {
      let re;
      try { re = new RegExp(row.gpu_pattern, 'i'); } catch { continue; } // 잘못 입력된 정규식 행은 무시
      if (re.test(gpu) && (!best || row.total_score > best.total_score)) best = row;
    }
    if (!best) return send(response, 200, { tier: null });

    return send(response, 200, { tier: tierFromScore(best.total_score), device: best.device, score: best.total_score });
  } catch (error) {
    console.error('Device tier lookup failed', error);
    return send(response, 200, { tier: null });
  }
};
