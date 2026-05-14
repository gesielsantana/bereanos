'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (error) {
      setError('Erro ao enviar o link. Tente novamente.')
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.png" alt="Geração Bereana" width={120} height={120} className="mx-auto mb-4" />
          <p className="text-stone-400 text-sm mt-1">Leitura que transforma</p>
        </div>

        {sent ? (
          <div className="bg-stone-900 rounded-2xl p-6 text-center border border-stone-800">
            <div className="text-3xl mb-3">✉️</div>
            <p className="text-white font-medium">Link enviado!</p>
            <p className="text-stone-400 text-sm mt-2">
              Verifique sua caixa de entrada em{' '}
              <span className="text-amber-400">{email}</span> e clique no link para entrar.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-stone-900 rounded-2xl p-6 border border-stone-800">
            <label className="block text-stone-300 text-sm font-medium mb-2">
              Seu email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="voce@email.com"
              required
              className="w-full bg-stone-800 text-white rounded-xl px-4 py-3 text-sm border border-stone-700 focus:outline-none focus:border-amber-500 placeholder:text-stone-500"
            />
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-xl py-3 text-sm transition-colors"
            >
              {loading ? 'Enviando...' : 'Entrar com link mágico'}
            </button>
            <p className="text-stone-500 text-xs text-center mt-4">
              Sem senha. Você receberá um link no seu email.
            </p>
          </form>
        )}
      </div>
    </main>
  )
}
