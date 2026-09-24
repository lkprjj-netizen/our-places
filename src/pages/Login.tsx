import { useState } from 'react'
import { supabase } from '../lib/supabase'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')

    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください。')
      return
    }

    setLoading(true)
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません。')
    } else {
      console.log('ログイン成功')
      console.log('Session:', data.session)
      console.log('User:', data.user)
    }

    setLoading(false)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F5F0] px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-sm tracking-[0.3em] text-stone-500">
            OUR
          </p>

          <h1 className="mt-1 text-4xl font-semibold tracking-tight text-stone-800">
            PLACES
          </h1>

          <p className="mt-4 text-sm text-stone-500">
            ふたりの「行きたい」を残そう。
          </p>
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-sm">
          <label className="block text-sm font-medium text-stone-700">
            メールアドレス
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            className="mt-2 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-stone-400"
          />

          <label className="mt-5 block text-sm font-medium text-stone-700">
            パスワード
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-2 w-full rounded-2xl border border-stone-200 px-4 py-3 text-sm outline-none transition focus:border-stone-400"
          />

          {error && (
            <p className="mt-4 text-sm text-red-500">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-stone-800 py-3 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">
          ふたりだけの場所を、ひとつずつ。
        </p>
      </div>
    </main>
  )
}

export default Login
