// 마스코트 알파 채널 분석(윤곽선/랜드마크/글로우 마스크)을 메인스레드가 아닌 별도 워커 스레드에서
// 수행하기 위한 파일. index.html의 readAlpha/bodyLandmarks/landmarksFromAlpha/ringFromAlpha/
// outsideMask/outwardBand와 동일한 알고리즘을 OffscreenCanvas 기반으로 이식한 것 — 결과가
// 메인스레드 버전과 동일해야 하므로 로직을 바꿀 때는 항상 양쪽을 같이 수정할 것.
// 구형 브라우저(Worker/OffscreenCanvas 미지원) 대비 fallback으로 메인스레드 버전은 index.html에
// 그대로 남겨둠 — 이 워커는 추가 경로일 뿐, 기존 경로를 대체하지 않음(additive-only).

function readAlphaFromBitmap(bitmap) {
  const w = bitmap.width, h = bitmap.height;
  const c = new OffscreenCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  let data;
  try { data = ctx.getImageData(0, 0, w, h).data; } catch (e) { return null; }
  return { w, h, data };
}

function bodyLandmarks(w, h, isOn) {
  function rowSpan(y) {
    let minX = -1, maxX = -1;
    for (let x = 0; x < w; x++) { if (isOn(x, y)) { if (minX === -1) minX = x; maxX = x; } }
    return minX === -1 ? null : { minX, maxX, width: maxX - minX };
  }
  let headTopY = -1;
  for (let y = 0; y < h; y++) { if (rowSpan(y)) { headTopY = y; break; } }
  if (headTopY === -1) return null;
  const zoneStart = headTopY + Math.floor(h * 0.03), zoneEnd = Math.min(h - 1, headTopY + Math.floor(h * 0.22));
  let baseWidth = 1;
  for (let y = zoneStart; y <= zoneEnd; y++) { const span = rowSpan(y); if (span && span.width > baseWidth) baseWidth = span.width; }
  let shoulderY = Math.min(h - 1, headTopY + Math.floor(h * 0.30));
  for (let y = zoneEnd; y < h; y++) { const span = rowSpan(y); if (span && span.width > baseWidth * 1.7) { shoulderY = y; break; } }
  let contentBottomY = -1;
  for (let y = h - 1; y >= headTopY; y--) { if (rowSpan(y)) { contentBottomY = y; break; } }
  if (contentBottomY === -1) return null;
  const nearBottomStart = Math.max(headTopY, Math.floor(headTopY + (contentBottomY - headTopY) * 0.9));
  let nearBottomY = contentBottomY, nearBottomWidth = -1;
  for (let y = nearBottomStart; y <= contentBottomY; y++) { const span = rowSpan(y); if (span && span.width > nearBottomWidth) { nearBottomWidth = span.width; nearBottomY = y; } }
  const headUnit = Math.max(1, shoulderY - headTopY), proportionHipY = headTopY + Math.round(headUnit * 2.9);
  const hipY = Math.min(proportionHipY, nearBottomY);
  const hipSpan = rowSpan(hipY) || rowSpan(nearBottomY);
  const headSpan = rowSpan(headTopY), shoulderSpan = rowSpan(shoulderY);
  if (!headSpan || !shoulderSpan || !hipSpan) return null;
  return {
    head: { x: (headSpan.minX + headSpan.maxX) / 2, y: headTopY },
    shoulder: { x: (shoulderSpan.minX + shoulderSpan.maxX) / 2, y: shoulderY },
    hip: { x: (hipSpan.minX + hipSpan.maxX) / 2, y: hipY },
  };
}

function landmarksFromAlpha(alpha) {
  return alpha ? bodyLandmarks(alpha.w, alpha.h, (x, y) => alpha.data[(y * alpha.w + x) * 4 + 3] > 20) : null;
}

async function ringFromAlpha(w, h, data) {
  const c = new OffscreenCanvas(w, h);
  const ctx = c.getContext('2d'), id = ctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, on = data[i * 4 + 3] > 20;
    let ring = false;
    if (on) {
      const l = x > 0 ? data[(i - 1) * 4 + 3] > 20 : false, r = x < w - 1 ? data[(i + 1) * 4 + 3] > 20 : false,
        u = y > 0 ? data[(i - w) * 4 + 3] > 20 : false, dn = y < h - 1 ? data[(i + w) * 4 + 3] > 20 : false;
      ring = !(l && r && u && dn);
    }
    id.data[i * 4] = 170; id.data[i * 4 + 1] = 140; id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = ring ? 255 : 0;
  }
  ctx.putImageData(id, 0, 0);
  return c.convertToBlob({ type: 'image/png' });
}

async function outsideMask(w, h, data, fadeStartFrac) {
  const c = new OffscreenCanvas(w, h);
  const ctx = c.getContext('2d'), id = ctx.createImageData(w, h);
  const fadeStart = h * (fadeStartFrac == null ? .55 : fadeStartFrac), fadeEnd = h * .92, minA = .10;
  for (let y = 0; y < h; y++) {
    let taper = 1;
    if (y > fadeStart) { const t = Math.min(1, (y - fadeStart) / (fadeEnd - fadeStart)); taper = 1 - t * (1 - minA); }
    for (let x = 0; x < w; x++) {
      const i = y * w + x, outside = !(data[i * 4 + 3] > 20);
      id.data[i * 4] = 255; id.data[i * 4 + 1] = 255; id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = outside ? Math.round(255 * taper) : 0;
    }
  }
  ctx.putImageData(id, 0, 0);
  return c.convertToBlob({ type: 'image/png' });
}

async function outwardBand(w, h, data) {
  let minX = w, maxX = -1, minY = h, maxY = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] > 20) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (maxX < 0) return null;
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  const base = new OffscreenCanvas(w, h);
  const bctx = base.getContext('2d'), id = bctx.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, on = data[i * 4 + 3] > 20;
    id.data[i * 4] = 56; id.data[i * 4 + 1] = 142; id.data[i * 4 + 2] = 255; id.data[i * 4 + 3] = on ? 255 : 0;
  }
  bctx.putImageData(id, 0, 0);
  const c = new OffscreenCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1.045, 1.045); ctx.translate(-cx, -cy); ctx.drawImage(base, 0, 0); ctx.restore();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(base, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  return c.convertToBlob({ type: 'image/png' });
}

self.onmessage = async (e) => {
  const { id, bitmap, fadeStartFrac } = e.data;
  try {
    const alpha = readAlphaFromBitmap(bitmap);
    bitmap.close();
    if (!alpha) { self.postMessage({ id, ok: false }); return; }
    const landmarks = landmarksFromAlpha(alpha);
    const [ringBlob, maskBlob, outwardBlob] = await Promise.all([
      ringFromAlpha(alpha.w, alpha.h, alpha.data),
      outsideMask(alpha.w, alpha.h, alpha.data, fadeStartFrac),
      outwardBand(alpha.w, alpha.h, alpha.data),
    ]);
    // alpha.data는 히트테스트(cacheAlphaHit)용으로 메인스레드에도 그대로 필요 — Transferable로
    // 제로카피 전송. 이후 이 워커 쪽에서는 더 이상 안 쓰므로 안전하게 넘길 수 있음.
    self.postMessage(
      { id, ok: true, w: alpha.w, h: alpha.h, alphaBuffer: alpha.data.buffer, landmarks, ringBlob, maskBlob, outwardBlob },
      [alpha.data.buffer]
    );
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err) });
  }
};
