const https = require('https');

function fetchUrl(url, token) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { 'Authorization': `Bearer ${token}` }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.OURA_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token no configurado' });

  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  try {
    const [sleepData, readinessData, activityData] = await Promise.all([
      fetchUrl(`https://api.ouraring.com/v2/usercollection/sleep?start_date=${yesterday}&end_date=${today}`, token),
      fetchUrl(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${yesterday}&end_date=${today}`, token),
      fetchUrl(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${yesterday}&end_date=${today}`, token),
    ]);

    const sleep = sleepData?.data?.[sleepData.data.length - 1] || null;
    const readiness = readinessData?.data?.[readinessData.data.length - 1] || null;
    const activity = activityData?.data?.[activityData.data.length - 1] || null;

    return res.status(200).json({
      date: today,
      readiness: {
        score: readiness?.score || null,
      },
      sleep: {
        total_hours: sleep?.total_sleep_duration ? +(sleep.total_sleep_duration / 3600).toFixed(1) : null,
        efficiency: sleep?.efficiency || null,
        deep_hours: sleep?.deep_sleep_duration ? +(sleep.deep_sleep_duration / 3600).toFixed(1) : null,
        hrv_avg: sleep?.average_hrv || null,
        resting_hr: sleep?.lowest_heart_rate || null,
      },
      activity: {
        total_calories: activity?.total_calories || null,
        active_calories: activity?.active_calories || null,
        steps: activity?.steps || null,
      },
    });

  } catch (err) {
    return res.status(500).json({ error: 'Error al conectar con Oura', detail: err.message });
  }
};
