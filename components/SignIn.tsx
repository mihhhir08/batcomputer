"use client";

import { useState } from "react";
import Image from "next/image";
import { supabase } from "../lib/supabase.ts";

export function SignIn() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function sendLink() {
    if (!supabase || !email) return;
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setMessage(error ? error.message : "Check your inbox for your private sign-in link.");
    setSending(false);
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <span className="brand-mark"><Image src="/batcomputer-mark.svg" alt="" width={48} height={24} priority /></span>
        <h1>Identity required.</h1>
        <p>This terminal is private. Sign in to mount the mission database.</p>
        <label>
          Email address
          <input type="email" value={email} placeholder="you@example.com"
            onChange={(event) => setEmail(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && sendLink()} />
        </label>
        <button onClick={sendLink} disabled={sending || !email}>
          {sending ? "Sending…" : "Email me a sign-in link"}
        </button>
        {message && <div className="auth-message" role="status">{message}</div>}
        <small>Passwordless · Private · Encrypted in transit</small>
      </section>
    </main>
  );
}
