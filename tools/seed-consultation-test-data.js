const fs = require('node:fs');

for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([^#][^=]*)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
}

const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SECRET_KEY;
if (!base || !key) throw new Error('SUPABASE_URL or SUPABASE_SECRET_KEY is missing');

const industries = ['뷰티', '식품', '교육', 'IT·소프트웨어', '건강·의료', '패션', '여행', '부동산', '자동차', '생활용품'];
const serviceSets = [
  ['AI 모델·이미지', '광고 소재'],
  ['카드뉴스', 'SNS 콘텐츠 관리'],
  ['제품 상세페이지', '광고 소재', 'AI 모델·이미지'],
  ['원페이지 릴스', 'SNS 콘텐츠 관리'],
  ['AI 모델·이미지', '카드뉴스', '제품 상세페이지'],
];
const statuses = ['new', 'contacting', 'in_progress', 'completed', 'cancelled'];
const channels = ['sms', 'open_kakao', 'website'];
const names = ['김민준', '이서연', '박지훈', '최수빈', '정현우', '한지민', '윤도현', '송예린', '강태윤', '오하늘'];

const pad = value => String(value).padStart(2, '0');
const rows = Array.from({ length: 50 }, (_, index) => {
  const number = index + 1;
  const created = new Date(Date.now() - index * 86400000);
  const desired = new Date(Date.now() + (number + 5) * 86400000);
  return {
    receipt_id: `TEST-BETA2-${String(number).padStart(3, '0')}`,
    brand: `[테스트] ${industries[index % industries.length]} 브랜드 ${pad(number)}`,
    contact_name: `${names[index % names.length]} 테스트${pad(number)}`,
    phone: `010-9000-${String(number).padStart(4, '0')}`,
    industry: industries[index % industries.length],
    email: `vizentive.test+${String(number).padStart(3, '0')}@example.com`,
    services: serviceSets[index % serviceSets.length],
    quantity: `이미지 ${number % 8 + 3}장, 영상 ${number % 4 + 1}편`,
    desired_date: desired.toISOString().slice(0, 10),
    message: `[테스트 상담 ${pad(number)}] ${industries[index % industries.length]} 캠페인에 사용할 콘텐츠 제작을 문의합니다. 브랜드 분위기와 주요 고객층에 맞춘 기획, 제작 일정, 견적 안내를 부탁드립니다.`,
    channel: channels[index % channels.length],
    consent: true,
    status: statuses[index % statuses.length],
    user_agent: 'VIZENTIVE consultation test data seeder',
    created_at: created.toISOString(),
    updated_at: created.toISOString(),
  };
});

async function request(path, options = {}) {
  const response = await fetch(`${base}/rest/v1/consultation_inquiries${path}`, {
    ...options,
    headers: { apikey: key, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!response.ok) throw new Error(`${response.status}: ${(await response.text()).slice(0, 500)}`);
  const text = await response.text();
  return text ? JSON.parse(text) : [];
}

async function main() {
  const existing = await request('?receipt_id=like.TEST-BETA2-*&select=receipt_id');
  const existingIds = new Set(existing.map(row => row.receipt_id));
  const missing = rows.filter(row => !existingIds.has(row.receipt_id));
  if (missing.length) await request('', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(missing) });
  const verified = await request('?receipt_id=like.TEST-BETA2-*&select=receipt_id,status,channel&order=receipt_id.asc');
  const statusCounts = Object.fromEntries(statuses.map(value => [value, verified.filter(row => row.status === value).length]));
  const channelCounts = Object.fromEntries(channels.map(value => [value, verified.filter(row => row.channel === value).length]));
  console.log(`INSERTED=${missing.length}`);
  console.log(`VERIFIED_TOTAL=${verified.length}`);
  console.log(`STATUS_COUNTS=${JSON.stringify(statusCounts)}`);
  console.log(`CHANNEL_COUNTS=${JSON.stringify(channelCounts)}`);
}

main().catch(error => { console.error(`SEED_ERROR=${error.message}`); process.exitCode = 1; });
