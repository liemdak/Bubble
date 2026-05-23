import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Supabase redirects here after user clicks the magic link email
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const isNew = searchParams.get('new') === '1'

  if (code) {
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // New users: trigger wallet creation then go to app
      if (isNew) {
        return NextResponse.redirect(`${origin}/api/auth/register?redirect=/chat`)
      }
      return NextResponse.redirect(`${origin}/chat`)
    }
  }

  // Auth failed — redirect to login with error param
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
