const {
  send,
  signSession,
  generateRecipes,
  generateNetSlots,
  timingPolicy,
  sceneHierarchy,
  BOOTSTRAP_REC_COUNT,
  BOOTSTRAP_NET_COUNT,
  ELIGIBLE_TORUS_CANDIDATE_COUNT,
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

  try {
    const { token, exp } = signSession(secret);
    const payload = {
      v: 1,
      exp,
      mode: Math.random() < 0.5 ? 0 : 1,
      torusPick: Math.floor(Math.random() * ELIGIBLE_TORUS_CANDIDATE_COUNT),
      cfg: timingPolicy(),
      hier: sceneHierarchy(),
      net: generateNetSlots(BOOTSTRAP_NET_COUNT),
      rec: generateRecipes(BOOTSTRAP_REC_COUNT),
      tok: token,
    };
    return send(response, 200, payload);
  } catch {
    return send(response, 500, { error: 'Failed to build spatial session' });
  }
};
