(() => {
  const menu = document.querySelector('#adminMenu');
  if (!menu) return;
  const style = document.createElement('style');
  style.textContent = `.admin-overlay{position:fixed;inset:0;z-index:200;background:#f7f4fa;color:#211a29;overflow:auto;padding:28px}.admin-shell{width:min(1200px,100%);margin:auto}.admin-head,.admin-tools{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.admin-head{margin-bottom:24px}.admin-head h2{font-size:clamp(1.8rem,4vw,3rem);margin:0}.admin-close{border:0;border-radius:99px;background:#211a29;color:#fff;padding:12px 20px;cursor:pointer}.admin-tools{background:#fff;padding:16px;border-radius:18px;margin-bottom:18px}.admin-tools input,.admin-tools select{font:inherit;border:1px solid #ddd4e5;border-radius:10px;padding:11px 13px}.admin-tools input{flex:1;min-width:240px}.admin-table-wrap{overflow:auto;background:#fff;border-radius:18px}.admin-table{border-collapse:collapse;width:100%;min-width:900px}.admin-table th,.admin-table td{padding:14px;text-align:left;border-bottom:1px solid #eee8f2;font-size:.88rem;vertical-align:top}.admin-table th{background:#f0eaf5}.admin-empty{text-align:center;padding:50px!important;color:#756d7e}.admin-detail{white-space:pre-wrap;max-width:320px}.admin-count{color:#756d7e}.admin-error{color:#b42318}`;
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
    const overlay = document.createElement('section');
    overlay.className = 'admin-overlay';
    overlay.innerHTML = `<div class="admin-shell"><header class="admin-head"><div><small>VIZENTIVE ADMIN</small><h2>상담 기록</h2><span class="admin-count"></span></div><button class="admin-close" type="button">신청 화면으로 돌아가기</button></header><div class="admin-tools"><input type="search" placeholder="접수번호, 업체명, 이름, 전화번호, 이메일 검색"><select><option value="">전체 상태</option><option value="new">신규</option><option value="contacting">연락 중</option><option value="in_progress">진행 중</option><option value="completed">완료</option><option value="cancelled">취소</option></select></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>접수일</th><th>상태</th><th>신청자</th><th>연락처</th><th>서비스</th><th>문의 내용</th></tr></thead><tbody></tbody></table></div></div>`;
    document.body.append(overlay);
    document.body.style.overflow = 'hidden';
    const input = overlay.querySelector('input'), select = overlay.querySelector('select'), tbody = overlay.querySelector('tbody'), count = overlay.querySelector('.admin-count');
    const render = () => {
      const q = input.value.trim().toLowerCase();
      const filtered = rows.filter(row => (!select.value || row.status === select.value) && (!q || [row.receipt_id,row.brand,row.contact_name,row.phone,row.email,row.industry].some(v => String(v || '').toLowerCase().includes(q))));
      count.textContent = `검색 결과 ${filtered.length}건 · 최근 최대 500건`;
      tbody.innerHTML = filtered.length ? filtered.map(row => `<tr><td>${esc(new Date(row.created_at).toLocaleString('ko-KR'))}<br><small>${esc(row.receipt_id)}</small></td><td>${esc(status(row.status))}</td><td><strong>${esc(row.contact_name)}</strong><br>${esc(row.brand)}<br><small>${esc(row.industry)}</small></td><td><a href="tel:${esc(row.phone)}">${esc(row.phone)}</a><br><a href="mailto:${esc(row.email)}">${esc(row.email)}</a><br><small>${esc(channel(row.channel))}</small></td><td>${esc((row.services || []).join(', '))}<br><small>${esc(row.quantity || '')}</small></td><td class="admin-detail">${esc(row.message || '-')}</td></tr>`).join('') : '<tr><td class="admin-empty" colspan="6">조건에 맞는 상담 기록이 없습니다.</td></tr>';
    };
    input.addEventListener('input', render); select.addEventListener('change', render); render();
    overlay.querySelector('.admin-close').addEventListener('click', () => { overlay.remove(); document.body.style.overflow = ''; });
  });
})();
