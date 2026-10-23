exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { subject, mode } = JSON.parse(event.body);
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'API Key nicht konfiguriert' }) };
    }

    const randomSeed = Math.floor(Math.random() * 100000);
    const promptText = `Erstelle genau 10 Multiple-Choice-Fragen für die 4. Klasse im Fach '${subject}' (Thema: '${mode}'). Seed: ${randomSeed}. Antworte AUSSCHLIESSLICH als gültiges JSON-Array im Format: [{"q":"Frage?","options":["A","B","C","D"],"a":0}] - die richtige Antwort ist bei Index 0. Kein anderer Text, nur das reine JSON.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: promptText }],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return { statusCode: response.status, body: errText };
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Bereinige Markdown-Formatierungen und parse das JSON direkt auf dem Server
    let cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsed = JSON.parse(cleaned);

    return {
      statusCode: 200,
      body: JSON.stringify(parsed)
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
