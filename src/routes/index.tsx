import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Mic, Sparkles, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SpeakDaily — Practise English speaking every day" },
      { name: "description", content: "Speak on a daily topic, record yourself, and get instant AI feedback on your English." },
      { property: "og:title", content: "SpeakDaily — Practise English speaking every day" },
      { property: "og:description", content: "Daily topics, voice recording and AI feedback for English learners." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const steps = [
    { icon: CalendarDays, t: "A new topic daily", d: "Fresh, everyday prompts to talk about." },
    { icon: Mic, t: "Record yourself", d: "Speak for a minute or two, right in your browser." },
    { icon: Sparkles, t: "Get AI feedback", d: "Grammar fixes, better words and a fluency tip." },
  ];
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col px-6">
      <header className="flex items-center justify-between py-6">
        <span className="font-display text-xl font-semibold">SpeakDaily</span>
        <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
      </header>
      <section className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">
          Speak English with <span className="text-primary italic">confidence</span>, one day at a time.
        </h1>
        <p className="mt-5 max-w-xl text-muted-foreground">
          Pick today's topic, talk out loud, and get clear, friendly feedback in seconds.
        </p>
        <Link to="/auth" className="mt-8"><Button size="lg">Start practising</Button></Link>
        <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.t} className="rounded-xl border bg-card p-5 text-left">
              <s.icon className="h-5 w-5 text-accent" />
              <h3 className="mt-3 font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
