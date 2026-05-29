'use client'

import { useState } from 'react'

const FAQS = [
  {
    q: 'What is Bubble?',
    a: 'Bubble is a conversational payment app. You type what you want — "send 50 USDC to Sarah" — and Bubble handles the wallet, fees, and blockchain under the hood. No crypto knowledge required.',
  },
  {
    q: 'Do I need a crypto wallet to sign up?',
    a: 'Yes, you connect with MetaMask to verify your identity. Bubble then creates a smart wallet for you automatically — you never have to manage keys or seed phrases.',
  },
  {
    q: 'Is it free to use?',
    a: 'Yes. Bubble runs on Arc Testnet where gas fees are ~$0.006 per transaction and are sponsored automatically. You only need free testnet USDC from the Circle faucet.',
  },
  {
    q: 'What tokens are supported?',
    a: 'USDC, EURC, and USYC on Arc Testnet. USDC can also be bridged cross-chain via Circle\'s CCTP protocol.',
  },
  {
    q: 'How fast are transactions?',
    a: 'Arc Testnet confirms in under one second. You\'ll see the "Sent" confirmation almost immediately after you click Confirm.',
  },
  {
    q: 'Is this real money?',
    a: 'No — Bubble currently runs on Arc Testnet. All USDC is testnet tokens with no real-world value. Get free tokens at faucet.circle.com.',
  },
  {
    q: 'Can I send to someone not in my contacts?',
    a: 'Yes. You can paste a wallet address directly in the chat, or add someone to your contacts first so you can refer to them by name next time.',
  },
  {
    q: 'Who built Bubble?',
    a: 'Bubble was built by Dak.',
  },
]

export function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" style={{
      background: '#000000',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      padding: '100px 24px',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Label */}
        <p style={{
          textAlign: 'center',
          fontSize: 11,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.35)',
          letterSpacing: '0.14em',
          marginBottom: 16,
          textTransform: 'uppercase',
        }}>
          FAQ
        </p>

        {/* Heading */}
        <h2 style={{
          fontSize: 'clamp(28px, 4vw, 42px)',
          fontWeight: 300,
          letterSpacing: '-0.8px',
          textAlign: 'center',
          color: '#ffffff',
          marginBottom: 56,
          lineHeight: 1.2,
        }}>
          Questions &amp; answers.
        </h2>

        {/* Accordion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {FAQS.map((item, i) => {
            const isOpen = open === i
            return (
              <div
                key={i}
                style={{
                  background: isOpen ? 'rgba(163,230,53,0.04)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isOpen ? 'rgba(163,230,53,0.18)' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 10,
                  overflow: 'hidden',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
              >
                {/* Question row */}
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                    padding: '20px 24px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  <span style={{
                    fontSize: 15,
                    fontWeight: 400,
                    color: isOpen ? '#ffffff' : 'rgba(255,255,255,0.75)',
                    lineHeight: 1.4,
                  }}>
                    {item.q}
                  </span>
                  <span style={{
                    flexShrink: 0,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    color: isOpen ? '#a3e635' : 'rgba(255,255,255,0.4)',
                    transition: 'color 0.2s, transform 0.2s',
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                  }}>
                    +
                  </span>
                </button>

                {/* Answer */}
                {isOpen && (
                  <p style={{
                    margin: 0,
                    padding: '0 24px 20px',
                    fontSize: 14,
                    fontWeight: 300,
                    color: 'rgba(255,255,255,0.50)',
                    lineHeight: 1.7,
                  }}>
                    {item.a}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
