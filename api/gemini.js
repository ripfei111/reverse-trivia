export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'GEMINI_API_KEY is not configured on the server.' },
      { status: 500 }
    );
  }

  try {
    const { prompt, systemInstruction, responseMimeType } = await request.json();
    const models = ['gemini-3.0-flash', 'gemini-2.5-flash-lite'];
    let lastError = null;

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        ...(systemInstruction
          ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
          : {}),
        generationConfig: {
          temperature: 0.85,
          ...(responseMimeType ? { responseMimeType } : {}),
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const text =
          data?.candidates?.[0]?.content?.parts
            ?.map((p) => p.text || '')
            .join('') || '';
        return Response.json({ text });
      }

      lastError = await res.text();
      if (res.status !== 404 && res.status !== 429 && res.status !== 503) {
        break;
      }
    }

    return Response.json(
      { error: `Gemini API failed: ${lastError || 'Unknown error'}` },
      { status: 502 }
    );
  } catch (err) {
    return Response.json(
      { error: err.message || 'Server error calling Gemini.' },
      { status: 500 }
    );
  }
}
