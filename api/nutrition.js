export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const apiKey = process.env.GEMINI_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key no configurada' });

  const { query, meal } = req.body || {};
  if (!query) return res.status(400).json({ error: 'Falta el campo query' });

  try {
    const prompt = `Eres un nutricionista experto con acceso a bases de datos nutricionales precisas (USDA, BEDCA).
El usuario te dice qué comió: "${query}"

Devuelve SOLO un JSON válido, sin texto extra, sin markdown, sin backticks. Exactamente este formato:
{
  "name": "nombre descriptivo y corto del plato o alimento (máx 40 chars)",
  "prot": número en gramos de proteína total (entero),
  "carb": número en gramos de carbohidratos totales (entero),
  "fat": número en gramos de grasas totales (entero),
  "kcal": número de calorías totales (entero),
  "items": [
    { "food": "nombre alimento", "amount": "cantidad", "prot": número, "carb": número, "fat": número, "kcal": número }
  ],
  "notes": "tip nutricional breve y útil en 1 línea, máx 80 chars"
}

Reglas:
- Si hay múltiples alimentos, calcula cada uno por separado en "items" y suma en los totales
- Usa valores por defecto estándar para preparaciones típicas (cocido, asado, etc.)
- Si no se especifica preparación, asume la más común
- Todos los números son enteros sin decimales
- El campo "notes" debe ser útil, no repetir los macros`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 500 }
        })
      }
    );

    const data = await response.json();
    
    if (data.error) {
      return res.status(500).json({ error: 'Error de Gemini: ' + data.error.message });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Extraer JSON aunque venga con ```json ... ``` o texto extra
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Respuesta inválida de Gemini', raw: text });
    }
    
    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: 'Error al conectar con Gemini', detail: err.message });
  }
}
