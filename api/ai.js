// Serverless function: keeps your free Gemini API key private on the server.
module.exports = async (req, res) => {
  if (req.method === "GET") {
    // Test page: open /api/ai in your browser to see if the AI connection works.
    const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
    const hasKey = !!process.env.GEMINI_API_KEY;
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY || "" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Say hi" }] }] })
      });
      const j = await r.json();
      return res.status(200).json({ model, hasKey, googleStatus: r.status, message: (j.error && j.error.message) || "OK - AI works" });
    } catch (e) {
      return res.status(200).json({ model, hasKey, message: "Could not reach Google" });
    }
  }
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const prompt = req.body && req.body.prompt;
    if (typeof prompt !== "string" || prompt.length < 5 || prompt.length > 15000)
      return res.status(400).json({ error: "Invalid prompt" });
    const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 8000, responseMimeType: "application/json" }
    });
    let r, j;
    for (let i = 0; i < 3; i++) {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
        body
      });
      j = await r.json();
      if (r.ok || (r.status !== 429 && r.status !== 503 && r.status !== 500)) break;
      await new Promise(x => setTimeout(x, 2000 * (i + 1)));
    }
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || "API error" });
    const text = ((j.candidates && j.candidates[0] && j.candidates[0].content.parts) || []).map(p => p.text || "").join("");
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
};
