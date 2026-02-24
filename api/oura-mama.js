export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const TOKEN = process.env.OURA_TOKEN_MAMA;
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const [readiness, sleep, activity] = await Promise.all([
      fetch(`https://api.ouraring.com/v2/usercollection/daily_readiness?start_date=${today}&end_date=${today}`, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }).then(r => r.json()),
      fetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${today}&end_date=${today}`, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }).then(r => r.json()),
      fetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${today}&end_date=${today}`, {
        headers: { Authorization: `Bearer ${TOKEN}` }
      }).then(r => r.json()),
    ]);

    res.json({
      readiness: { score: readiness.data?.[0]?.score },
      sleep: {
        total_hours: sleep.data?.[0]?.contributors?.total_sleep
          ? +(sleep.data[0].contributors.total_sleep / 3600).toFixed(1) : null,
        efficiency: sleep.data?.[0]?.contributors?.efficiency,
        deep_hours: sleep.data?.[0]?.contributors?.deep_sleep
          ? +(sleep.data[0].contributors.deep_sleep / 3600).toFixed(1) : null,
        hrv_avg: sleep.data?.[0]?.contributors?.hrv_balance,
      },
      activity: {
        total_calories: activity.data?.[0]?.total_calories,
        active_calories: activity.data?.[0]?.active_calories,
        steps: activity.data?.[0]?.steps,
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
