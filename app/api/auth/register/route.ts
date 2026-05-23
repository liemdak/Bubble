import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Called after magic link auth for new users.
// Creates Circle wallet and saves to DB, then redirects.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const redirect = searchParams.get('redirect') ?? '/chat'

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  // Check if user already has a wallet (idempotent)
  const { data: existing } = await supabase
    .from('users')
    .select('circle_wallet_id')
    .eq('id', user.id)
    .single()

  if (existing?.circle_wallet_id) {
    return NextResponse.redirect(`${origin}${redirect}`)
  }

  // TODO: Create Circle Dev-Controlled Wallet here (Step 5)
  // For now, create user row without wallet — wallet added in Step 5
  await supabase.from('users').upsert({
    id: user.id,
    email: user.email,
    display_name: user.user_metadata?.display_name ?? user.email?.split('@')[0],
  })

  return NextResponse.redirect(`${origin}${redirect}`)
}
