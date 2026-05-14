import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/admin'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !isAdmin(user.email)) {
    return Response.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { projectName } = await request.json()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('name, email')
    .not('email', 'is', null)

  if (!profiles || profiles.length === 0) {
    return Response.json({ error: 'Nenhum membro com email encontrado' }, { status: 400 })
  }

  await Promise.all(
    profiles.map(({ name, email }) =>
      resend.emails.send({
        from: 'Geração Bereana <onboarding@resend.dev>',
        to: email,
        subject: `Novo projeto de leitura: ${projectName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #1c1917; color: #e7e5e4; padding: 32px; border-radius: 16px;">
            <h2 style="color: #f59e0b; margin-bottom: 8px;">📚 Geração Bereana</h2>
            <p style="color: #a8a29e; font-size: 14px; margin-bottom: 24px;">Leitura que transforma</p>
            <p style="font-size: 16px;">Olá, <strong>${name}</strong>!</p>
            <p style="color: #d6d3d1;">Um novo projeto de leitura foi iniciado:</p>
            <div style="background: #292524; border: 1px solid #44403c; border-radius: 12px; padding: 16px; margin: 20px 0;">
              <p style="color: #f59e0b; font-size: 18px; font-weight: bold; margin: 0;">📖 ${projectName}</p>
            </div>
            <p style="color: #d6d3d1;">Acesse o app para acompanhar seu progresso e ver o ranking do grupo.</p>
            <a href="https://bereanos-gamma.vercel.app" style="display: inline-block; margin-top: 16px; background: #f59e0b; color: #1c1917; font-weight: bold; padding: 12px 24px; border-radius: 12px; text-decoration: none;">
              Abrir o app →
            </a>
          </div>
        `,
      })
    )
  )

  return Response.json({ ok: true, sent: profiles.length })
}
