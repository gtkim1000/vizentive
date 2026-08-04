const { timingSafeEqual } = require('node:crypto');

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, private');
  res.end(JSON.stringify(body));
}

function sameSecret(value, expected) {
  const a = Buffer.from(String(value || ''));
  const b = Buffer.from(String(expected || ''));
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return send(res, 405, { error: 'Method not allowed' });
  }

  const password = process.env.ADMIN_PWD;
  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!password || !supabaseUrl || !secretKey) return send(res, 503, { error: '관리자 조회 기능이 설정되지 않았습니다.' });
  if (!sameSecret(req.headers['x-admin-password'], password)) return send(res, 401, { error: '관리자 비밀번호가 올바르지 않습니다.' });

  const fields = 'receipt_id,brand,contact_name,phone,industry,email,services,quantity,desired_date,message,channel,status,created_at';
  try {
    const db = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/consultation_inquiries?select=${fields}&order=created_at.desc&limit=500`, {
      headers: { apikey: secretKey },
    });
    if (!db.ok) {
      console.error('Admin inquiry lookup failed', db.status, (await db.text()).slice(0, 300));
      return send(res, 502, { error: '상담 기록을 불러오지 못했습니다.' });
    }
    return send(res, 200, { inquiries: await db.json() });
  } catch (error) {
    console.error('Admin inquiry lookup failed', error);
    return send(res, 502, { error: '상담 기록을 불러오지 못했습니다.' });
  }
};
