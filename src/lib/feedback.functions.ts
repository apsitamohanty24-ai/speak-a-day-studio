import { createServerFn } from "@tanstack/react-start";

export const getFeedback = createServerFn({ method: "POST" })
  .inputValidator((d: { topic: string; transcript: string }) => {
    if (!d.transcript?.trim() || d.transcript.length > 8000) throw new Error("Invalid transcript");
    return { topic: String(d.topic).slice(0, 300), transcript: d.transcript };
  })
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI is not configured");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions:
          "You are a friendly English speaking coach. The text is a speech-to-text transcript of a learner speaking on a topic. Give concise feedback in markdown-free plain text with these sections: Score (x/10), What went well, Grammar fixes (quote -> correction), Better vocabulary, Fluency tip, Improved version (short). Keep it under 250 words.",
        input: `Topic: ${data.topic}\n\nTranscript: ${data.transcript}`,
      }),
    });
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Too many requests, try again shortly.");
      if (res.status === 402) throw new Error("AI credits exhausted.");
      throw new Error(`AI error ${res.status}: ${t.slice(0, 200)}`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let out = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const p = line.slice(5).trim();
        if (!p || p === "[DONE]") continue;
        try {
          const ev = JSON.parse(p);
          if (ev.type === "response.output_text.delta") out += ev.delta;
        } catch {}
      }
    }
    if (!out.trim()) throw new Error("No feedback returned. Please try again.");
    return { feedback: out.trim() };
  });
