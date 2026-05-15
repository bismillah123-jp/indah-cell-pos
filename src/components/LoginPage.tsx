import { FormEvent, useState } from 'react';
import { LockKeyhole, Mail, ShoppingBag } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submitLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (!supabase) {
      setError('Supabase belum dikonfigurasi di file .env.');
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signInError) setError(signInError.message);
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10 text-earth-900">
      <section className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-earth-200 bg-white shadow-soft md:grid-cols-[1fr_420px]">
        <div className="relative hidden min-h-[560px] bg-earth-900 p-8 text-white md:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,rgba(196,123,89,0.26),transparent_28rem),linear-gradient(160deg,#2f241f_0%,#4b352b_56%,#344b39_100%)]" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-clay-400 text-earth-900">
                <ShoppingBag size={24} />
              </div>
              <div>
                <h1 className="text-xl font-black">Indah Cell</h1>
                <p className="text-sm font-semibold text-earth-100">POS konter HP modern</p>
              </div>
            </div>
            <div className="max-w-md">
              <p className="text-sm font-bold uppercase tracking-normal text-clay-100">Secure Workspace</p>
              <h2 className="mt-3 text-4xl font-black leading-tight">
                Login kasir cepat, data toko tetap rapi.
              </h2>
              <div className="mt-6 grid grid-cols-3 gap-3 text-sm font-bold">
                <span className="rounded-2xl bg-white/10 p-3">Auth</span>
                <span className="rounded-2xl bg-white/10 p-3">RBAC</span>
                <span className="rounded-2xl bg-white/10 p-3">Realtime</span>
              </div>
            </div>
          </div>
        </div>

        <form className="grid gap-5 p-6 sm:p-8" onSubmit={submitLogin}>
          <div>
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-earth-900 text-white md:hidden">
              <ShoppingBag size={24} />
            </div>
            <p className="mt-5 text-xs font-bold uppercase tracking-normal text-earth-500">Masuk ke POS</p>
            <h2 className="text-2xl font-black text-earth-900">Indah Cell</h2>
          </div>

          <label className="field">
            Email
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-400" size={18} />
              <input
                className="input pl-10"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="owner@indahcell.test"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="field">
            Password
            <div className="relative">
              <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-earth-400" size={18} />
              <input
                className="input pl-10"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password Supabase Auth"
                autoComplete="current-password"
                required
              />
            </div>
          </label>

          {error && <div className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}

          <button className="btn-primary min-h-12 text-base" disabled={loading}>
            {loading ? 'Memproses...' : 'Login'}
          </button>

          <p className="rounded-2xl bg-earth-50 p-4 text-sm font-semibold text-earth-600">
            Akun dibuat dari Supabase Auth, lalu role-nya diatur di tabel users_roles.
          </p>
        </form>
      </section>
    </main>
  );
};
