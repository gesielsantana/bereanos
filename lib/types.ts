export type Profile = {
  id: string
  name: string
  created_at: string
}

export type Project = {
  id: string
  name: string
  type: 'bible' | 'book'
  total_chapters: number
  start_date: string
  end_date: string | null
  active: boolean
  created_at: string
}

export type WeeklyGoal = {
  id: string
  project_id: string
  week_number: number
  chapter_start: number
  chapter_end: number
  due_date: string
}

export type Progress = {
  id: string
  user_id: string
  project_id: string
  current_chapter: number
  updated_at: string
}

export type RankingEntry = {
  user_id: string
  name: string
  current_chapter: number
  percent: number
}
