"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.refresh();
      router.push("/");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Login gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="space-y-5">
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Account Access</div>
          <h1 className="mt-2 text-3xl font-bold text-white">Login</h1>
        </div>

        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />

        <Button className="w-full" onClick={submit} disabled={loading}>{loading ? "Masuk..." : "Login"}</Button>

        <p className="text-sm text-slate-300">
          Belum punya akun? <Link href="/register" className="font-semibold text-brand-300">Register</Link>
        </p>
      </Card>
    </div>
  );
}
