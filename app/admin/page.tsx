'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { isAdmin } from '@/lib/admin'
import type { Project, WeeklyGoal } from '@/lib/types'

export default function AdminPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [goals, setGoals] = useState<WeeklyGoal[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const [newProject, setNewProject] = useState({
    name: '', type: 'bible' as 'bible' | 'book', total_chapters: '', start_date: ''
  })
  const [newGoal, setNewGoal] = useState({
    week_number: '', chapter_start: '', chapter_end: '', due_date: ''
  })
  const [savingProject, setSavingProject] = useState(false)
  const [savingGoal, setSavingGoal] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [notifyMsg, setNotifyMsg] = useState('')

  const loadData = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !isAdmin(user.email ?? '')) { router.replace('/dashboard'); return }

    const { data: projs } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    setProjects(projs ?? [])
    setSelectedProject(prev => prev || (projs?.[0]?.id ?? ''))
    setLoading(false)
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!selectedProject) return
    const supabase = createClient()
    supabase
      .from('weekly_goals')
      .select('*')
      .eq('project_id', selectedProject)
      .order('week_number')
      .then(({ data }) => setGoals(data ?? []))
  }, [selectedProject])

  async function createProject(e: React.FormEvent) {
    e.preventDefault()
    setSavingProject(true)
    const supabase = createClient()
    const { data } = await supabase.from('projects').insert({
      name: newProject.name,
      type: newProject.type,
      total_chapters: parseInt(newProject.total_chapters),
      start_date: newProject.start_date || null,
      active: true,
    }).select().single()

    setNewProject({ name: '', type: 'bible', total_chapters: '', start_date: '' })
    if (data) setSelectedProject(data.id)
    await loadData()
    setSavingProject(false)
  }

  async function toggleActive(proj: Project) {
    const supabase = createClient()
    await supabase.from('projects').update({ active: !proj.active }).eq('id', proj.id)
    await loadData()
  }

  async function createGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProject) return
    setSavingGoal(true)
    const supabase = createClient()
    await supabase.from('weekly_goals').insert({
      project_id: selectedProject,
      week_number: parseInt(newGoal.week_number),
      chapter_start: parseInt(newGoal.chapter_start),
      chapter_end: parseInt(newGoal.chapter_end),
      due_date: newGoal.due_date,
    })
    setNewGoal({ week_number: '', chapter_start: '', chapter_end: '', due_date: '' })
    const { data } = await supabase
      .from('weekly_goals')
      .select('*')
      .eq('project_id', selectedProject)
      .order('week_number')
    setGoals(data ?? [])
    setSavingGoal(false)
  }

  async function notifyMembers(projectName: string) {
    setNotifying(true)
    setNotifyMsg('')
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName }),
      })
      const data = await res.json()
      if (data.ok) {
        setNotifyMsg(`✅ Email enviado para ${data.sent} membro(s)!`)
      } else {
        setNotifyMsg(`❌ Erro: ${data.error}`)
      }
    } catch {
      setNotifyMsg('❌ Erro de rede. Tente novamente.')
    } finally {
      setNotifying(false)
    }
  }

  async function deleteGoal(id: string) {
    const supabase = createClient()
    await supabase.from('weekly_goals').delete().eq('id', id)
    setGoals(g => g.filter(x => x.id !== id))
  }

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
          <button onClick={() => router.push('/dashboard')} className="text-stone-400 hover:text-white text-sm">
            ← Voltar
          </button>
          <span className="text-white font-bold text-sm">Painel Admin</span>
          <div className="w-16" />
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">

        {/* Criar projeto */}
        <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800">
          <p className="text-stone-300 text-sm font-medium mb-4">Novo projeto de leitura</p>
          <form onSubmit={createProject} className="space-y-3">
            <input
              type="text"
              placeholder="Nome (ex: Atos dos Apóstolos)"
              value={newProject.name}
              onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))}
              required
              className="w-full bg-stone-800 text-white rounded-xl px-4 py-2.5 text-sm border border-stone-700 focus:outline-none focus:border-amber-500 placeholder:text-stone-500"
            />
            <div className="flex gap-2">
              <select
                value={newProject.type}
                onChange={e => setNewProject(p => ({ ...p, type: e.target.value as 'bible' | 'book' }))}
                className="flex-1 bg-stone-800 text-white rounded-xl px-4 py-2.5 text-sm border border-stone-700 focus:outline-none focus:border-amber-500"
              >
                <option value="bible">Livro bíblico</option>
                <option value="book">Obra cristã</option>
              </select>
              <input
                type="number"
                placeholder="Nº cap."
                value={newProject.total_chapters}
                onChange={e => setNewProject(p => ({ ...p, total_chapters: e.target.value }))}
                required
                min={1}
                className="w-24 bg-stone-800 text-white rounded-xl px-3 py-2.5 text-sm border border-stone-700 focus:outline-none focus:border-amber-500 placeholder:text-stone-500"
              />
            </div>
            <input
              type="date"
              value={newProject.start_date}
              onChange={e => setNewProject(p => ({ ...p, start_date: e.target.value }))}
              className="w-full bg-stone-800 text-white rounded-xl px-4 py-2.5 text-sm border border-stone-700 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={savingProject}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 font-semibold rounded-xl py-2.5 text-sm transition-colors"
            >
              {savingProject ? 'Criando...' : 'Criar projeto'}
            </button>
          </form>
        </div>

        {/* Lista de projetos */}
        {projects.length > 0 && (
          <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800">
            <p className="text-stone-300 text-sm font-medium mb-3">Projetos</p>
            <div className="space-y-2">
              {projects.map(proj => (
                <div
                  key={proj.id}
                  onClick={() => setSelectedProject(proj.id)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border ${selectedProject === proj.id ? 'border-amber-500 bg-amber-500/10' : 'border-stone-700 hover:border-stone-600'}`}
                >
                  <div>
                    <p className={`text-sm font-medium ${selectedProject === proj.id ? 'text-amber-400' : 'text-white'}`}>
                      {proj.name}
                    </p>
                    <p className="text-stone-500 text-xs">{proj.total_chapters} capítulos</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); notifyMembers(proj.name) }}
                      disabled={notifying}
                      className="text-xs px-2.5 py-1 rounded-full font-medium bg-stone-700 text-amber-400 hover:bg-stone-600 disabled:opacity-50"
                    >
                      {notifying ? '...' : '📢'}
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); toggleActive(proj) }}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${proj.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-700 text-stone-400'}`}
                    >
                      {proj.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {notifyMsg && (
          <div className="bg-stone-900 rounded-2xl px-5 py-3 border border-stone-800 text-sm text-stone-300">
            {notifyMsg}
          </div>
        )}

        {/* Metas semanais */}
        {selectedProject && (
          <div className="bg-stone-900 rounded-2xl p-5 border border-stone-800">
            <p className="text-stone-300 text-sm font-medium mb-4">Metas semanais</p>

            <form onSubmit={createGoal} className="space-y-3 mb-4">
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Semana"
                  value={newGoal.week_number}
                  onChange={e => setNewGoal(g => ({ ...g, week_number: e.target.value }))}
                  required
                  min={1}
                  className="w-24 bg-stone-800 text-white rounded-xl px-3 py-2.5 text-sm border border-stone-700 focus:outline-none focus:border-amber-500 placeholder:text-stone-500"
                />
                <input
                  type="number"
                  placeholder="Cap. início"
                  value={newGoal.chapter_start}
                  onChange={e => setNewGoal(g => ({ ...g, chapter_start: e.target.value }))}
                  required
                  min={1}
                  className="flex-1 bg-stone-800 text-white rounded-xl px-3 py-2.5 text-sm border border-stone-700 focus:outline-none focus:border-amber-500 placeholder:text-stone-500"
                />
                <input
                  type="number"
                  placeholder="Cap. fim"
                  value={newGoal.chapter_end}
                  onChange={e => setNewGoal(g => ({ ...g, chapter_end: e.target.value }))}
                  required
                  min={1}
                  className="flex-1 bg-stone-800 text-white rounded-xl px-3 py-2.5 text-sm border border-stone-700 focus:outline-none focus:border-amber-500 placeholder:text-stone-500"
                />
              </div>
              <input
                type="date"
                value={newGoal.due_date}
                onChange={e => setNewGoal(g => ({ ...g, due_date: e.target.value }))}
                required
                className="w-full bg-stone-800 text-white rounded-xl px-4 py-2.5 text-sm border border-stone-700 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={savingGoal}
                className="w-full bg-stone-700 hover:bg-stone-600 disabled:opacity-50 text-white font-medium rounded-xl py-2.5 text-sm transition-colors"
              >
                {savingGoal ? 'Salvando...' : '+ Adicionar meta'}
              </button>
            </form>

            {goals.length === 0 ? (
              <p className="text-stone-600 text-sm text-center py-2">Nenhuma meta criada.</p>
            ) : (
              <div className="space-y-2">
                {goals.map(goal => (
                  <div key={goal.id} className="flex items-center justify-between bg-stone-800 rounded-xl px-3 py-2.5">
                    <div>
                      <span className="text-stone-400 text-xs">Semana {goal.week_number} · </span>
                      <span className="text-white text-sm">Cap. {goal.chapter_start}–{goal.chapter_end}</span>
                      <span className="text-stone-500 text-xs ml-2">
                        até {new Date(goal.due_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteGoal(goal.id)}
                      className="text-stone-600 hover:text-red-400 text-sm ml-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
