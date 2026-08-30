const {
  send,
  verifySession,
  signSession,
  clampCount,
  generateRecipes,
  generateNetSlots,
  MAX_REC,
  NEXT_DEFAULT_REC_COUNT,
  NEXT_NET_COUNT,
  REFRESH_WINDOW_SEC,
} = require('./_lib');

module.exports = async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET');
    return send(response, 405, { error: 'Method not allowed' });
  }

  const secret = process.env.SPATIAL_SIGNING_SECRET;
  if (!secret) {
    return send(response, 503, { error: 'Spatial bootstrap is not configured' });
  }

  const token = request.headers['x-spatial-token'];
  const session = verifySession(secret, token);
  if (!session) {
    return send(response, 401, { error: 'Invalid or expired session' });
  }

  const url = new URL(request.url, `http://${request.headers.host || '127.0.0.1'}`);
  const count = clampCount(url.searchParams.get('count') ?? undefined, NEXT_DEFAULT_REC_COUNT, MAX_REC);
  if (count === null) {
    return send(response, 400, { error: 'Invalid count parameter' });
  }

  try {
    const payload = {
      v: 1,
      net: generateNetSlots(NEXT_NET_COUNT),
      rec: generateRecipes(count),
    };

    const now = Math.floor(Date.now() / 1000);
    if (session.exp - now < REFRESH_WINDOW_SEC) {
      const renewed = signSession(secret);
      payload.tok = renewed.token;
      payload.exp = renewed.exp;
    }

    return send(response, 200, payload);
  } catch {
    return send(response, 500, { error: 'Failed to build spatial recipes' });
  }
};
