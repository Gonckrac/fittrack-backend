module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = req.method === 'POST' ? req.body?.access_token : null;
  if (!token) return res.status(400).json({ error: 'Token requerido' });

  const today = new Date().toISOString().split('T')[0];

  try {
    const [sleepRes, activityRes, profileRes] = await Promise.all([
      fetch(`https://api.fitbit.com/1.2/user/-/sleep/date/${today}.json`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch(`https://api.fitbit.com/1/user/-/activities/date/${today}.json`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch(`https://api.fitbit.com/1/user/-/profile.json`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
    ]);

    const [sleepData, activityData] = await Promise.all([
      sleepRes.json(),
      activityRes.json(),
      profileRes.json(), // no lo usamos pero lo pedimos para validar el token
    ]);

    // Sueño: tomar el sleep principal del día
    const mainSleep = sleepData?.sleep?.find(s => s.isMainSleep) || sleepData?.sleep?.[0] || null;
    const summary   = sleepData?.summary || {};

    const totalMinutes  = mainSleep?.minutesAsleep || 0;
    const deepMinutes   = summary?.stages?.deep || 0;
    const efficiency    = mainSleep?.efficiency || null;
    const hrvData       = mainSleep?.levels?.data || [];

    // Pasos y calorías
    const steps    = activityData?.summary?.steps || 0;
    const calories = activityData?.summary?.caloriesOut || null;

    return res.status(200).json({
      date: today,
      readiness: {
        score: null, // Fitbit no tiene readiness score como Oura
      },
      sleep: {
        total_hours:  totalMinutes  ? +(totalMinutes  / 60).toFixed(1) : null,
        deep_hours:   deepMinutes   ? +(deepMinutes   / 60).toFixed(1) : null,
        efficiency:   efficiency,
        hrv_avg:      null, // requiere Fitbit Premium
        resting_hr:   activityData?.summary?.restingHeartRate || null,
      },
      activity: {
        steps:           steps,
        total_calories:  calories,
        active_calories: activityData?.summary?.activityCalories || null,
      },
    });

  } catch (err) {
    return res.status(500).json({ error: 'Error al conectar con Fitbit', detail: err.message });
  }
};