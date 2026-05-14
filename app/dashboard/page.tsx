'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/admin'
import type { Project, WeeklyGoal, RankingEntry } from '@/lib/types'

export default function DashboardPage() {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [weeklyGoal, setWeeklyGoal] = useState<WeeklyGoal | null>(null)
  const [myChapter, setMyChapter] = useState(0)
  const [inputChapter, setInputChapter] = useState('')
  const [ranking, setRanking] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/'); return }

    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()

    if (!profile?.name) { router.replace('/perfil'); return }

    setUser({ id: user.id, email: user.email ?? '' })

    const { data: proj } = await supabase
      .from('projects')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!proj) { setLoading(false); return }
    setProject(proj)

    const today = new Date().toISOString().slice(0, 10)
    const { data: goal } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('project_id', proj.id)
      .lte('due_date', today)
      .order('due_date', { ascending: false })
      .limit(1)
      .single()

    setWeeklyGoal(goal ?? null)

    const { data: myProgress } = await supabase
      .from('progress')
      .select('current_chapter')
      .eq('user_id', user.id)
      .eq('project_id', proj.id)
      .single()

    const chapter = myProgress?.current_chapter ?? 0
    setMyChapter(chapter)
    setInputChapter(String(chapter))

    const { data: allProgress } = await supabase
      .from('progress')
      .select('user_id, current_chapter')
      .eq('project_id', proj.id)

    const userIds = (allProgress ?? []).map((p: { user_id: string }) => p.user_id)

    const { data: allProfiles } = userIds.length > 0
      ? await supabase.from('profiles').select('id, name').in('id', userIds)
      : { data: [] }

    const profileMap: Record<string, string> = Object.fromEntries(
      (allProfiles ?? []).map((p: { id: string; name: string }) => [p.id, p.name])
    )

    const entries: RankingEntry[] = (allProgress ?? []).map((p: {
      user_id: string
      current_chapter: number
    }) => ({
      user_id: p.user_id,
      name: profileMap[p.user_id] ?? 'Sem nome',
      current_chapter: p.current_chapter,
      percent: Math.round((p.current_chapter / proj.total_chapters) * 100),
    })).sort((a: RankingEntry, b: RankingEntry) => b.current_chapter - a.current_chapter)

    setRanking(entries)
    setLoading(false)
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  async function saveProgress() {
    const chapter = parseInt(inputChapter)
    if (isNaN(chapter) || chapter < 0 || !project) return
    const capped = Math.min(chapter, project.total_chapters)
    setSaving(true)
    const supabase = createClient()
    await supabase.from('progress').upsert({
      user_id: user!.id,
      project_id: project.id,
      current_chapter: capped,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,project_id' })
    setMyChapter(capped)
    await loadData()
    setSaving(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.replace('/')
  }

  const myPercent = project ? Math.round((myChapter / project.total_chapters) * 100) : 0

  const currentGoalMet = weeklyGoal ? myChapter >= weeklyGoal.chapter_end : false

  if (loading) {
    return (
      <main className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-stone-500 text-sm">Carregando...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-stone-950 pb-10">
      <header className="bg-stone-900 border-b border-stone-800 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Geração Bereana" width={28} height={28} className="rounded-full" />
            <span className="text-white font-bold text-sm">Geração Bereana</span>
          </div>
          <div className="flex items-center gap-3">
            {user && isAdmin(user.email) && (
              <button
                onClick={() => router.push('/admin')}
                className="text-amber-400 text-xs font-medium hover:text-amber-300"
              >
                Admin
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-stone-500 text-xs hover:text-stone-300"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {!project ? (
          <div className="bg-stone-900 rounded-2xl p-6 text-center border border-stone-800">
            <div className="text-3xl mb-2">📚</div>
            <p className="text-stone-400 text-sm">Nenhum projeto de leitura ativo no momento.</p>
            {user && isAdmin(user.email) && (
              <button
                onClick={() => router.push('/admin')}
                className="mt-3 text-amber-400 text-sm font-medium hover:text-amber-300"
              >
                Criar projeto →
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Projeto ativo */}
            <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-stone-500 text-xs uppercase tracking-wider">Projeto atual</p>
                  <h2 className="text-white font-bold text-lg mt-0.5">{project.name}</h2>
                </div>
                <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full font-medium">
                  {project.type === 'bible' ? 'Bíblia' : 'Livro'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-stone-400">Meu progresso:</span>
                <span className="text-white font-bold">Cap. {myChapter}/{project.total_chapters}</span>
                <span className="text-amber-400 font-medium">{myPercent}%</span>
              </div>
              <div className="mt-3 bg-stone-800 rounded-full h-2">
                <div
                  className="bg-amber-500 h-2 rounded-full transition-all"
                  style={{ width: `${myPercent}%` }}
                />
              </div>
            </div>

            {/* Meta da semana */}
            {weeklyGoal && (
              <div className={`rounded-2xl p-5 border ${currentGoalMet ? 'bg-emerald-950/50 border-emerald-800' : 'bg-stone-900 border-stone-800'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-stone-500 text-xs uppercase tracking-wider">Meta da semana</p>
                    <p className="text-white font-semibold mt-0.5">
                      Capítulos {weeklyGoal.chapter_start} ao {weeklyGoal.chapter_end}
                    </p>
                    <p className="text-stone-500 text-xs mt-1">
                      Prazo: {new Date(weeklyGoal.due_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                  <div className="text-2xl">
                    {currentGoalMet ? '✅' : '🎯'}
                  </div>
                </div>
              </div>
            )}

            {/* Marcar progresso */}
            <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800">
              <p className="text-stone-300 text-sm font-medium mb-3">Atualizar meu progresso</p>
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2">
                  <span className="text-stone-500 text-sm">Cap.</span>
                  <input
                    type="number"
                    min={0}
                    max={project.total_chapters}
                    value={inputChapter}
                    onChange={e => setInputChapter(e.target.value)}
                    className="flex-1 bg-stone-800 text-white rounded-xl px-3 py-2.5 text-sm border border-stone-700 focus:outline-none focus:border-amber-500 text-center"
                  />
                  <span className="text-stone-500 text-sm">/ {project.total_chapters}</span>
                </div>
                <button
                  onClick={saveProgress}
                  disabled={saving}
                  className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors"
                >
                  {saving ? '...' : 'Salvar'}
                </button>
              </div>
            </div>

            {/* Ranking */}
            <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800">
              <p className="text-stone-300 text-sm font-medium mb-4">🏆 Ranking do grupo</p>
              {ranking.length === 0 ? (
                <p className="text-stone-500 text-sm text-center py-2">Nenhum progresso registrado ainda.</p>
              ) : (
                <div className="space-y-3">
                  {ranking.map((entry, i) => (
                    <div key={entry.user_id} className={`flex items-center gap-3 ${entry.user_id === user?.id ? 'opacity-100' : 'opacity-80'}`}>
                      <span className="text-sm w-5 text-center font-bold text-stone-500">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${entry.user_id === user?.id ? 'text-amber-400' : 'text-stone-300'}`}>
                            {entry.name} {entry.user_id === user?.id && '(você)'}
                          </span>
                          <span className="text-xs text-stone-500">
                            cap. {entry.current_chapter} · {entry.percent}%
                          </span>
                        </div>
                        <div className="bg-stone-800 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${entry.user_id === user?.id ? 'bg-amber-500' : 'bg-stone-600'}`}
                            style={{ width: `${entry.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
