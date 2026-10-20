import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/lib/supabase";
import { getFeedback } from "@/lib/feedback.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mic, Square, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/practice")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Practise — SpeakDaily" },
      { name: "description", content: "Record yourself on today's topic and get AI feedback." },
      { property: "og:title", content: "Practise — SpeakDaily" },
      { property: "og:description", content: "Record yourself on today's topic and get AI feedback." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Practice,
});

const TOPICS = [
  "Describe your morning routine.",
  "Talk about your favourite food and why you like it.",
  "What did you do last weekend?",
  "Describe a place you would love to visit.",
  "Talk about a book or film you enjoyed recently.",
  "What is a skill you want to learn and why?",
  "Describe your best friend.",
  "Should students wear school uniforms? Give your opinion.",
  "Talk about a memorable trip.",
  "How do you usually spend your evenings?",
  "Describe your hometown.",
  "What are the pros and cons of social media?",
];
const dayIndex = Math.floor(Date.now() / 86400000);

type Session = { id: string; topic: string; transcript: string; feedback: string; created_at: string };

function Practice() {
  const nav = useNavigate();
  const feedbackFn = useServerFn(getFeedback);
  const [userId, setUserId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const topic = TOPICS[(dayIndex + offset) % TOPICS.length];
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Session[]>([]);
  const recRef = useRef<MediaRecorder | null>(null);
  const srRef = useRef<any>(null);
  const finalRef = useRef("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) nav({ to: "/auth" });
      else { setUserId(data.user.id); loadHistory(); }
    });
  }, []);

  async function loadHistory() {
    const { data } = await supabase.from("practice_sessions").select("*").order("created_at", { ascending: false }).limit(10);
    setHistory((data as Session[]) ?? []);
  }

  async function start() {
    setError(""); setFeedback(""); setTranscript(""); setAudioUrl(null); finalRef.current = "";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        setAudioUrl(URL.createObjectURL(new Blob(chunks, { type: mr.mimeType })));
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      recRef.current = mr;
    } catch {
      setError("Microphone access was denied.");
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const sr = new SR();
      sr.lang = "en-US"; sr.continuous = true; sr.interimResults = true;
      sr.onresult = (e: any) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalRef.current += r[0].transcript + " ";
          else interim += r[0].transcript;
        }
        setTranscript(finalRef.current + interim);
      };
      sr.onend = () => { if (recRef.current?.state === "recording") sr.start(); };
      sr.start();
      srRef.current = sr;
    } else {
      setError("Live transcription isn't supported in this browser (try Chrome). You can type what you said below.");
    }
    setRecording(true);
  }

  function stop() {
    recRef.current?.stop();
    const sr = srRef.current; srRef.current = null;
    if (sr) { sr.onend = null; sr.stop(); }
    setRecording(false);
  }

  async function analyse() {
    if (!transcript.trim()) return setError("Nothing to analyse yet — record or type your answer.");
    setLoading(true); setError("");
    try {
      const { feedback } = await feedbackFn({ data: { topic, transcript } });
      setFeedback(feedback);
      if (userId) {
        await supabase.from("practice_sessions").insert({ user_id: userId, topic, transcript, feedback });
        loadHistory();
      }
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    }
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    nav({ to: "/", replace: true });
  }

  return (
    <main className="mx-auto max-w-2xl px-6 pb-16">
      <header className="flex items-center justify-between py-6">
        <span className="font-display text-xl font-semibold">SpeakDaily</span>
        <Button variant="ghost" onClick={signOut}>Sign out</Button>
      </header>

      <section className="rounded-xl border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-accent">Today's topic</p>
            <h1 className="mt-2 text-2xl font-semibold">{topic}</h1>
          </div>
          <Button variant="ghost" size="icon" aria-label="New topic" onClick={() => setOffset(offset + 1)} disabled={recording}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <Button size="lg" variant={recording ? "destructive" : "default"} className="h-16 w-16 rounded-full" onClick={recording ? stop : start} aria-label={recording ? "Stop" : "Record"}>
            {recording ? <Square className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>
          <p className="text-sm text-muted-foreground">{recording ? "Recording… tap to stop" : "Tap to start speaking"}</p>
          {audioUrl && <audio controls src={audioUrl} className="w-full" />}
        </div>

        <Textarea className="mt-4 min-h-28" placeholder="Your transcript appears here (you can edit it)…" value={transcript} onChange={(e) => setTranscript(e.target.value)} />
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        <Button className="mt-4 w-full" onClick={analyse} disabled={loading || recording}>
          {loading ? "Analysing…" : "Get AI feedback"}
        </Button>
      </section>

      {feedback && (
        <section className="mt-6 rounded-xl border bg-card p-6">
          <h2 className="text-xl font-semibold">Feedback</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{feedback}</p>
        </section>
      )}

      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Past sessions</h2>
          <div className="mt-3 space-y-2">
            {history.map((h) => (
              <details key={h.id} className="rounded-lg border bg-card p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  {h.topic} <span className="text-muted-foreground">· {new Date(h.created_at).toLocaleDateString()}</span>
                </summary>
                <p className="mt-2 text-sm italic text-muted-foreground">"{h.transcript}"</p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{h.feedback}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
