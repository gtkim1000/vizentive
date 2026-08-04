const { randomBytes } = require('node:crypto');

const MAX = {
  brand: 120,
  name: 80,
  phone: 40,
  industry: 80,
  email: 254,
  quantity: 200,
  date: 20,
  message: 4000,
};

function send(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function makeReceiptId() {
  const date = new Date().toISOString().slice(2, 10).replaceAll('-', '');
  return `VZ-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

module.exports = async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return send(response, 405, { error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !secretKey) {
    return send(response, 503, { error: 'Consultation database is not configured' });
  }

  let body;
  try {
    body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : (request.body || {});
  } catch {
    return send(response, 400, { error: 'Invalid JSON body' });
  }

  if (body.website) return send(response, 200, { receiptId: makeReceiptId() });

  const desiredDate = clean(body.date, MAX.date);
  const inquiry = {
    receipt_id: makeReceiptId(),
    brand: clean(body.brand, MAX.brand),
    contact_name: clean(body.name, MAX.name),
    phone: clean(body.phone, MAX.phone),
    industry: clean(body.industry, MAX.industry),
    email: clean(body.email, MAX.email).toLowerCase(),
    services: Array.isArray(body.services)
      ? body.services.map((value) => clean(value, 80)).filter(Boolean).slice(0, 12)
      : [],
    quantity: clean(body.quantity, MAX.quantity) || null,
    desired_date: /^\d{4}-\d{2}-\d{2}$/.test(desiredDate) ? desiredDate : null,
    message: clean(body.message, MAX.message) || null,
    channel: ['sms', 'open_kakao'].includes(body.channel) ? body.channel : 'website',
    consent: body.consent === true,
    status: 'new',
    user_agent: clean(request.headers['user-agent'], 500) || null,
  };

  if (
    !inquiry.brand ||
    !inquiry.contact_name ||
    !inquiry.phone ||
    !inquiry.industry ||
    !inquiry.email ||
    !inquiry.services.length ||
    !inquiry.consent
  ) {
    return send(response, 400, { error: 'Required consultation fields are missing' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)) {
    return send(response, 400, { error: 'Invalid email address' });
  }

  try {
    const supabaseResponse = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/consultation_inquiries`,
      {
        method: 'POST',
        headers: {
          apikey: secretKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(inquiry),
      },
    );

    if (!supabaseResponse.ok) {
      const detail = await supabaseResponse.text();
      console.error('Supabase consultation insert failed', supabaseResponse.status, detail.slice(0, 300));
      return send(response, 502, { error: 'Failed to save consultation' });
    }

    return send(response, 201, { receiptId: inquiry.receipt_id });
  } catch (error) {
    console.error('Consultation insert failed', error);
    return send(response, 502, { error: 'Failed to save consultation' });
  }
};
