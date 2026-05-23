import { RegisterForm } from './RegisterForm'

export default function RegisterPage() {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #171717',
      borderRadius: 8,
      padding: '40px 32px',
      width: '100%',
      maxWidth: 420,
      boxShadow: 'rgb(10,10,13) 4px 4px 0px 0px',
    }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.24px', marginBottom: 8 }}>
          Create your account
        </h1>
        <p style={{ fontSize: 14, fontWeight: 500, color: '#555' }}>
          Free forever. Your wallet is created instantly.
        </p>
      </div>

      {/* Feature highlights */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
        {[
          { icon: '⚡', text: 'Sub-second transactions on Arc' },
          { icon: '⛽', text: 'Gas fees ~$0.006, sponsored' },
          { icon: '🔐', text: 'Secured by Face ID / Passkey' },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 500, color: '#333' }}>
            <span>{icon}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <RegisterForm />

      <p style={{ marginTop: 24, fontSize: 13, fontWeight: 500, textAlign: 'center', color: '#555' }}>
        Already have an account?{' '}
        <a href="/login" style={{ color: '#000', fontWeight: 700, textDecoration: 'underline' }}>
          Log in
        </a>
      </p>

      <p style={{ marginTop: 16, fontSize: 11, fontWeight: 500, textAlign: 'center', color: '#888' }}>
        By signing up you agree to our Terms of Service.
      </p>
    </div>
  )
}
