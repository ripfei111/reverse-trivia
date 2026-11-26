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

    const tryModel = async (modelId) => {
      const cleanId = modelId.replace(/^models\//, '');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanId}:generateContent?key=${apiKey}`;
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    };

    const candidateModels = [
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3-flash-preview',
    ];
    let lastError = null;

    for (const model of candidateModels) {
      const res = await tryModel(model);
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

    // Fallback: auto-discover any active Flash model available to this API key
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (listRes.ok) {
      const listData = await listRes.json();
      const availableFlash = (listData.models || [])
        .filter(
          (m) =>
            (m.supportedGenerationMethods || []).includes('generateContent') &&
            m.name.toLowerCase().includes('flash') &&
            !candidateModels.includes(m.name.replace(/^models\//, ''))
        )
        .map((m) => m.name.replace(/^models\//, ''));

      for (const model of availableFlash) {
        const res = await tryModel(model);
        if (res.ok) {
          const data = await res.json();
          const text =
            data?.candidates?.[0]?.content?.parts
              ?.map((p) => p.text || '')
              .join('') || '';
          return Response.json({ text });
        }
        lastError = await res.text();
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
