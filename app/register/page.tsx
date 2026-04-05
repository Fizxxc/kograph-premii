"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);

    try {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });

      if (error) throw error;
      alert("Registrasi berhasil. Jika email confirmation aktif, cek inbox Anda.");
      router.push("/login");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Register gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="space-y-5">
        <div>
          <div className="text-sm uppercase tracking-[0.2em] text-slate-400">Create Account</div>
          <h1 className="mt-2 text-3xl font-bold text-white">Register</h1>
        </div>

        <Input placeholder="Nama lengkap" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input type="password" placeholder="Password minimal 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} />

        <Button className="w-full" onClick={submit} disabled={loading}>{loading ? "Mendaftar..." : "Register"}</Button>

        <p className="text-sm text-slate-300">
          Sudah punya akun? <Link href="/login" className="font-semibold text-brand-300">Login</Link>
        </p>
      </Card>
    </div>
  );
}
