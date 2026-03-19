module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { provider, code, redirectUri } = req.body || {};
    if (!provider || !code || !redirectUri) {
      return res.status(400).json({ error: 'Faltan parámetros' });
    }

    const configs = {
      oura: {
        tokenUrl: 'https://api.ouraring.com/oauth/token',
        clientId: process.env.OURA_CLIENT_ID,
        clientSecret: process.env.OURA_CLIENT_SECRET,
        authInBody: true,
      },
      garmin: {
        tokenUrl: 'https://connectapi.garmin.com/oauth-service/oauth/token',
        clientId: process.env.GARMIN_CLIENT_ID,
        clientSecret: process.env.GARMIN_CLIENT_SECRET,
        authInBody: true,
      },
      fitbit: {
        tokenUrl: 'https://api.fitbit.com/oauth2/token',
        clientId: process.env.FITBIT_CLIENT_ID,
        clientSecret: process.env.FITBIT_CLIENT_SECRET,
        authInBody: false, // Fitbit requiere Basic Auth header
      },
    };

    const cfg = configs[provider];
    if (!cfg) return res.status(400).json({ error: 'Provider inválido' });

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

    if (cfg.authInBody) {
      // Oura y Garmin: credenciales en el body
      params.append('client_id', cfg.clientId);
      params.append('client_secret', cfg.clientSecret);
    } else {
      // Fitbit: credenciales en Basic Auth header (Base64)
      const credentials = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    const response = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers,
      body: params.toString(),
    });

    const data = await response.json();
    return res.status(response.ok ? 200 : 400).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};