import { randomBytes } from 'node:crypto';

export const runtime = 'nodejs';

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

function json(status, body) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function clean(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

function makeReceiptId() {
  const date = new Date().toISOString().slice(2, 10).replaceAll('-', '');
  return `VZ-${date}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    return json(503, { error: 'Consultation database is not configured' });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: 'Invalid JSON body' });
  }

  if (body.website) return json(200, { receiptId: makeReceiptId() });

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
    user_agent: clean(request.headers.get('user-agent'), 500) || null,
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
    return json(400, { error: 'Required consultation fields are missing' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inquiry.email)) {
    return json(400, { error: 'Invalid email address' });
  }

  try {
    const response = await fetch(
      `${supabaseUrl.replace(/\/$/, '')}/rest/v1/consultation_inquiries`,
      {
        method: 'POST',
        headers: {
          apikey: secretKey,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(inquiry),
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      console.error('Supabase consultation insert failed', response.status, detail.slice(0, 300));
      return json(502, { error: 'Failed to save consultation' });
    }

    return json(201, { receiptId: inquiry.receipt_id });
  } catch (error) {
    console.error('Consultation insert failed', error);
    return json(502, { error: 'Failed to save consultation' });
  }
}
