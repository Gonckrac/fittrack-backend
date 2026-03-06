export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Falta el campo query' });

  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: 'Sos un nutricionista experto. Respondé SOLO con JSON válido, sin texto extra, sin markdown, sin backticks. Formato exacto: {"name":"nombre corto del plato","prot":25,"carb":40,"fat":8,"kcal":336,"notes":"tip nutricional breve","items":[{"food":"ingrediente","amount":"200g","prot":25,"carb":40,"fat":8}]}. Todos los números son enteros. kcal = prot*4 + carb*4 + fat*9. Calculá los macros de: ' + query
        }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    const text = data.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Respuesta inválida', raw: text });

    return res.status(200).json(JSON.parse(match[0]));
  } catch (err) {
    return res.status(500).json({ error: 'Error al conectar con Anthropic', detail: err.message });
  }
}
