export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Falta el campo query' });

  const apiKey = process.env.OPENROUTER_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' });

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.3-70b-instruct:free',
        temperature: 0.1,
        max_tokens: 512,
        messages: [
          {
            role: 'system',
            content: 'Sos un nutricionista experto. Respondé SOLO con JSON válido, sin texto extra, sin markdown, sin backticks. Formato exacto: {"name":"nombre corto del plato","prot":25,"carb":40,"fat":8,"kcal":336,"notes":"tip nutricional breve","items":[{"food":"ingrediente","amount":"200g","prot":25,"carb":40,"fat":8}]}. Todos los números son enteros. kcal = prot*4 + carb*4 + fat*9.'
          },
          {
            role: 'user',
            content: 'Calculá los macros de: ' + query
          }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);

    const text = data.choices?.[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'Respuesta inválida', raw: text });

    return res.status(200).json(JSON.parse(match[0]));
  } catch (err) {
    return res.status(500).json({ error: 'Error al conectar con OpenRouter', detail: err.message });
  }
}
