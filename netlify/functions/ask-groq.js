exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const subject = body.subject || 'Allgemein';
    const mode = body.mode || 'Standard';
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'GROQ_API_KEY ist in Netlify nicht hinterlegt!' }) };
    }

    let extraHint = "";
    let levelHint = "Niveau: 4. Klasse Grundschule, anspruchsvoll und fordernd (Vorbereitung auf den Übergang zum Gymnasium). Stelle knifflige Fragen zu Regeln, Ausnahmen und tiefergehendem Verständnis, die echtes Nachdenken erfordern.";

    if (subject === 'englisch') {
      extraHint = subject === 'englisch' && mode === 'phrases' ? "WICHTIG: Erstelle englische Sätze mit einer Lücke (markiert als '___'), in die das gesuchte Wort eingesetzt werden muss." : "";
      levelHint = "Niveau: Spielerisch und altersgerecht für die Grundschule (Englisch).";
    } else if (subject === 'turkisch') {
      extraHint = "WICHTIG: Erstelle kinderfreundliche Türkisch-Fragen (Vokabeln oder einfache Sätze) mit deutschen Erklärungen/Fragestellungen.";
      levelHint = "Niveau: Spielerisch und altersgerecht für die Grundschule (Türkisch).";
    }

    const randomSeed = Math.floor(Math.random() * 100000);
    const promptText = `Erstelle genau 10 hochwertige Multiple-Choice-Fragen für das Fach '${subject}' (Thema: '${mode}'). 
    ${levelHint}
    ${extraHint} 
    WICHTIG: 
    1. Nenne das gesuchte Zielwort oder die Lösung NIEMALS direkt in der Frage. Verwende stattdessen anspruchsvolle Umschreibungen, Grammatikregeln (z.B. Fälle, Zeiten, Wortarten, Rechtschreibfallen wie das/dass, seit/seid) oder logische Verknüpfungen.
    2. Alle 4 Antwortoptionen in 'options' müssen absolut unterschiedlich sein (keine doppelten Einträge) und plausible Fehler beinhalten, um das Kind zu fordern.
    Seed: ${randomSeed}. 
    Antworte AUSSCHLIESSLICH als gültiges JSON-Array im Format: [{"q":"Frage?","options":["A","B","C","D"],"a":0}] - die richtige Antwort ist bei Index 0. Kein anderer Text, nur das reine JSON.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [{ role: "user", content: promptText }],
        temperature: 0.7
      })
    });

    const responseText = await response.text();
    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: `Groq-Fehler (${response.status}): ${responseText}` }) };
    }

    let data = JSON.parse(responseText);
    let content = data.choices[0].message.content;
    let cleaned = content.replace(/```json/g, '').replace(/```/g, '').trim();
    let parsed = JSON.parse(cleaned);

    return {
      statusCode: 200,
      body: JSON.stringify(parsed)
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: `Server-Fehler: ${error.message}` }) };
  }
};
