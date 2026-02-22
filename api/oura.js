export default async function handler(req, res) {
  // CORS headers — permite que la app de GitHub Pages llame a este servidor
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = process.env.OURA_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token no configurado' });

  // Fecha de hoy en formato YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  try {
    const headers = { 'Authorization': `Bearer ${token}` };

    // Llamadas paralelas a la API de Oura
    const [sleepRes, readinessRes, activityRes, heartRes] = await Promise.all([
      fetch(`https://api.ouraring.com/v2/usercollection/sleep?start_date=${yesterday}&end_date=${today}`, { headers }),
      fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${yesterday}&end_date=${today}`, { headers }),
      fetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${yesterday}&end_date=${today}`, { headers }),
      fetch(`https://api.ouraring.com/v2/usercollection/heartrate?start_datetime=${yesterday}T00:00:00&end_datetime=${today}T23:59:59`, { headers }),
    ]);

    const [sleepData, readinessData, activityData] = await Promise.all([
      sleepRes.json(),
      readinessRes.json(),
      activityRes.json(),
    ]);

    // Extraer el dato mas reciente de cada endpoint
    const sleep = sleepData?.data?.[sleepData.data.length - 1] || null;
    const readiness = readinessData?.data?.[readinessData.data.length - 1] || null;
    const activity = activityData?.data?.[activityData.data.length - 1] || null;

    // Respuesta limpia con solo lo que necesita la app
    const result = {
      date: today,
      readiness: {
        score: readiness?.score || null,
        hrv_balance: readiness?.contributors?.hrv_balance || null,
        recovery_index: readiness?.contributors?.recovery_index || null,
      },
      sleep: {
        score: sleep?.score || null,
        total_hours: sleep?.total_sleep_duration ? +(sleep.total_sleep_duration / 3600).toFixed(1) : null,
        efficiency: sleep?.efficiency || null,
        deep_hours: sleep?.deep_sleep_duration ? +(sleep.deep_sleep_duration / 3600).toFixed(1) : null,
        rem_hours: sleep?.rem_sleep_duration ? +(sleep.rem_sleep_duration / 3600).toFixed(1) : null,
        hrv_avg: sleep?.average_hrv || null,
        resting_hr: sleep?.lowest_heart_rate || null,
        latency_min: sleep?.sleep_latency ? Math.round(sleep.sleep_latency / 60) : null,
      },
      activity: {
        total_calories: activity?.total_calories || null,
        active_calories: activity?.active_calories || null,
        steps: activity?.steps || null,
        met: activity?.met?.average || null,
      },
    };

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: 'Error al conectar con Oura', detail: err.message });
  }
}
