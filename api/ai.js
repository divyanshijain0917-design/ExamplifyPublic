// Serverless function: keeps your free Gemini API key private on the server.
module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const prompt = req.body && req.body.prompt;
    if (typeof prompt !== "string" || prompt.length < 5 || prompt.length > 15000)
      return res.status(400).json({ error: "Invalid prompt" });
    const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 4000, responseMimeType: "application/json" }
      })
    });
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: (j.error && j.error.message) || "API error" });
    const text = ((j.candidates && j.candidates[0] && j.candidates[0].content.parts) || []).map(p => p.text || "").join("");
    return res.status(200).json({ text });
  } catch (e) {
    return res.status(500).json({ error: "Server error" });
  }
};
