(() => {
  const menu = document.querySelector('#adminMenu');
  if (!menu) return;
  const style = document.createElement('style');
  style.textContent = `.admin-overlay{position:fixed;inset:0;z-index:200;background:#f7f4fa;color:#211a29;overflow:auto;padding:28px}.admin-shell{width:min(1440px,100%);margin:auto}.admin-head,.admin-tools{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.admin-head{margin-bottom:24px}.admin-head h2{font-size:clamp(1.8rem,4vw,3rem);margin:0}.admin-close{border:0;border-radius:99px;background:#211a29;color:#fff;padding:12px 20px;cursor:pointer}.admin-tools{background:#fff;padding:16px;border-radius:18px;margin-bottom:18px}.admin-tools input,.admin-tools select{font:inherit;border:1px solid #ddd4e5;border-radius:10px;padding:11px 13px}.admin-tools input{flex:1;min-width:240px}.admin-layout{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(360px,.85fr);gap:18px;align-items:start}.admin-table-wrap{overflow:auto;background:#fff;border-radius:18px;max-height:calc(100vh - 210px)}.admin-table{border-collapse:collapse;width:100%;min-width:760px}.admin-table th,.admin-table td{padding:14px;text-align:left;border-bottom:1px solid #eee8f2;font-size:.88rem;vertical-align:top}.admin-table th{background:#f0eaf5;position:sticky;top:0;z-index:1}.admin-table tbody tr{cursor:pointer}.admin-table tbody tr:hover,.admin-table tbody tr.selected{background:#f5effa}.admin-empty{text-align:center;padding:50px!important;color:#756d7e}.admin-count{color:#756d7e}.admin-detail{background:#fff;border-radius:18px;padding:24px;position:sticky;top:28px}.admin-detail h3{font-size:1.5rem;margin:0 0 4px}.admin-detail-id{color:#756d7e;font-size:.8rem;margin-bottom:22px}.admin-detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.admin-field{border:1px solid #e5ddec;border-radius:13px;padding:12px 14px;min-width:0}.admin-field.full{grid-column:1/-1}.admin-field label{display:block;color:#756d7e;font-size:.72rem;font-weight:700;margin-bottom:5px}.admin-field div{word-break:break-word;white-space:pre-wrap}.admin-field a{color:#4b2a70}.admin-placeholder{color:#8b8293;text-align:center;padding:70px 10px}.admin-status{display:inline-block;border-radius:99px;background:#eee5f5;padding:5px 10px;font-size:.78rem}@media(max-width:900px){.admin-overlay{padding:18px}.admin-layout{grid-template-columns:1fr}.admin-table-wrap{max-height:52vh}.admin-detail{position:static}.admin-detail-grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.admin-table{min-width:700px}}`;
  style.textContent += '.admin-table{min-width:2600px}';
  document.head.append(style);

  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const channel = value => ({ sms: '전화·문자', open_kakao: '카카오톡', website: '홈페이지' }[value] || value || '-');
  const status = value => ({ new: '신규', contacting: '연락 중', in_progress: '진행 중', completed: '완료', cancelled: '취소' }[value] || value || '-');

  menu.addEventListener('click', async event => {
    event.preventDefault();
    const password = prompt('관리자 비밀번호를 입력하세요.');
    if (!password) return;
    let response;
    try { response = await fetch('/api/admin-inquiries', { headers: { 'x-admin-password': password }, cache: 'no-store' }); }
    catch { return alert('관리자 서버에 연결하지 못했습니다.'); }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) return alert(result.error || '상담 기록을 불러오지 못했습니다.');
    const rows = Array.isArray(result.inquiries) ? result.inquiries : [];
    let selectedId = rows[0]?.receipt_id || '';
    let visibleRows = rows;
    const overlay = document.createElement('section');
    overlay.className = 'admin-overlay';
    overlay.innerHTML = `<div class="admin-shell"><header class="admin-head"><div><small>VIZENTIVE ADMIN</small><h2>상담 기록</h2><span class="admin-count"></span></div><button class="admin-close" type="button">신청 화면으로 돌아가기</button></header><div class="admin-tools"><input type="search" placeholder="접수번호, 업체명, 이름, 전화번호, 이메일 검색"><select><option value="">전체 상태</option><option value="new">신규</option><option value="contacting">연락 중</option><option value="in_progress">진행 중</option><option value="completed">완료</option><option value="cancelled">취소</option></select></div><div class="admin-layout"><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>DB 내부 ID</th><th>접수번호</th><th>회사·브랜드명</th><th>담당자명</th><th>전화번호</th><th>업종</th><th>이메일</th><th>신청 서비스</th><th>예상 제작 수량</th><th>희망 일정</th><th>문의 내용</th><th>희망 연락 방식</th><th>개인정보 동의</th><th>상담 상태</th><th>브라우저 정보</th><th>접수일시</th><th>최종 수정일시</th></tr></thead><tbody></tbody></table></div><aside class="admin-detail" aria-live="polite"></aside></div></div>`;
    document.body.append(overlay);
    document.body.style.overflow = 'hidden';
    const input = overlay.querySelector('input'), select = overlay.querySelector('select'), tbody = overlay.querySelector('tbody'), count = overlay.querySelector('.admin-count'), detail = overlay.querySelector('.admin-detail');

    const renderDetail = () => {
      const row = rows.find(item => item.receipt_id === selectedId);
      if (!row) { detail.innerHTML = '<div class="admin-placeholder">목록에서 상담 기록을 선택하세요.</div>'; return; }
      detail.innerHTML = `<h3>${esc(row.contact_name)} · ${esc(row.brand)}</h3><div class="admin-detail-id">${esc(row.receipt_id)} · ${esc(new Date(row.created_at).toLocaleString('ko-KR'))}</div><div class="admin-detail-grid"><div class="admin-field"><label>상담 상태</label><div><span class="admin-status">${esc(status(row.status))}</span></div></div><div class="admin-field"><label>희망 연락 방식</label><div>${esc(channel(row.channel))}</div></div><div class="admin-field"><label>접수번호</label><div>${esc(row.receipt_id || '미입력')}</div></div><div class="admin-field"><label>접수일시</label><div>${esc(row.created_at ? new Date(row.created_at).toLocaleString('ko-KR') : '미입력')}</div></div><div class="admin-field"><label>담당자명</label><div>${esc(row.contact_name || '미입력')}</div></div><div class="admin-field"><label>회사·브랜드명</label><div>${esc(row.brand || '미입력')}</div></div><div class="admin-field"><label>전화번호</label><div>${row.phone ? `<a href="tel:${esc(row.phone)}">${esc(row.phone)}</a>` : '미입력'}</div></div><div class="admin-field"><label>이메일</label><div>${row.email ? `<a href="mailto:${esc(row.email)}">${esc(row.email)}</a>` : '미입력'}</div></div><div class="admin-field"><label>업종</label><div>${esc(row.industry || '미입력')}</div></div><div class="admin-field"><label>희망 일정</label><div>${esc(row.desired_date || '미입력')}</div></div><div class="admin-field full"><label>신청 서비스</label><div>${esc((row.services || []).join(', ') || '미입력')}</div></div><div class="admin-field"><label>예상 제작 수량</label><div>${esc(row.quantity || '미입력')}</div></div><div class="admin-field"><label>개인정보 수집 동의</label><div>${row.consent === true ? '동의' : row.consent === false ? '미동의' : '미입력'}</div></div><div class="admin-field full"><label>문의 내용</label><div>${esc(row.message || '미입력')}</div></div><div class="admin-field"><label>최종 수정일시</label><div>${esc(row.updated_at ? new Date(row.updated_at).toLocaleString('ko-KR') : '미입력')}</div></div><div class="admin-field"><label>DB 내부 ID</label><div>${esc(row.id || '미입력')}</div></div><div class="admin-field full"><label>접수 브라우저 정보</label><div>${esc(row.user_agent || '미입력')}</div></div></div>`;
    };
    const render = () => {
      const q = input.value.trim().toLowerCase();
      visibleRows = rows.filter(row => (!select.value || row.status === select.value) && (!q || [row.receipt_id,row.brand,row.contact_name,row.phone,row.email,row.industry].some(v => String(v || '').toLowerCase().includes(q))));
      if (!visibleRows.some(row => row.receipt_id === selectedId)) selectedId = visibleRows[0]?.receipt_id || '';
      count.textContent = `검색 결과 ${visibleRows.length}건 · 최근 최대 500건`;
      tbody.innerHTML = visibleRows.length ? visibleRows.map(row => `<tr data-id="${esc(row.receipt_id)}" class="${row.receipt_id === selectedId ? 'selected' : ''}" tabindex="0"><td>${esc(row.id || '미입력')}</td><td>${esc(row.receipt_id || '미입력')}</td><td>${esc(row.brand || '미입력')}</td><td>${esc(row.contact_name || '미입력')}</td><td>${esc(row.phone || '미입력')}</td><td>${esc(row.industry || '미입력')}</td><td>${esc(row.email || '미입력')}</td><td>${esc((row.services || []).join(', ') || '미입력')}</td><td>${esc(row.quantity || '미입력')}</td><td>${esc(row.desired_date || '미입력')}</td><td>${esc(row.message || '미입력')}</td><td>${esc(channel(row.channel))}</td><td>${row.consent === true ? '동의' : row.consent === false ? '미동의' : '미입력'}</td><td>${esc(status(row.status))}</td><td>${esc(row.user_agent || '미입력')}</td><td>${esc(row.created_at ? new Date(row.created_at).toLocaleString('ko-KR') : '미입력')}</td><td>${esc(row.updated_at ? new Date(row.updated_at).toLocaleString('ko-KR') : '미입력')}</td></tr>`).join('') : '<tr><td class="admin-empty" colspan="17">조건에 맞는 상담 기록이 없습니다.</td></tr>';
      renderDetail();
    };
    const choose = target => { const tr = target.closest('tr[data-id]'); if (!tr) return; selectedId = tr.dataset.id; render(); if (innerWidth <= 900) detail.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
    tbody.addEventListener('click', event => choose(event.target));
    tbody.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(event.target); } });
    input.addEventListener('input', render); select.addEventListener('change', render); render();
    overlay.querySelector('.admin-close').addEventListener('click', () => { overlay.remove(); document.body.style.overflow = ''; });
  });
})();
