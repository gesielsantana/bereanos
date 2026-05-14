'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function PerfilPage() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()

      if (profile?.name) {
        router.replace('/dashboard')
      } else {
        setChecking(false)
      }
    }
    check()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/'); return }

    await supabase.from('profiles').upsert({ id: user.id, name: name.trim(), email: user.email })
    router.replace('/dashboard')
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-stone-500 text-sm">Carregando...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">👋</div>
          <h1 className="text-xl font-bold text-white">Bem-vindo(a)!</h1>
          <p className="text-stone-400 text-sm mt-1">Como você quer ser chamado(a)?</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-stone-900 rounded-2xl p-6 border border-stone-800">
          <label className="block text-stone-300 text-sm font-medium mb-2">
            Seu nome
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ex: Maria"
            required
            autoFocus
            className="w-full bg-stone-800 text-white rounded-xl px-4 py-3 text-sm border border-stone-700 focus:outline-none focus:border-amber-500 placeholder:text-stone-500"
          />
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="w-full mt-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-xl py-3 text-sm transition-colors"
          >
            {loading ? 'Salvando...' : 'Entrar no grupo'}
          </button>
        </form>
      </div>
    </main>
  )
}
