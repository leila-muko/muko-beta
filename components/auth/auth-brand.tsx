'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'

const AUTH_TYPED_WORDS = ['muko.', 'creative intelligence.', 'private beta.']

export function AuthBrand() {
  const [activeWordIndex, setActiveWordIndex] = useState(0)
  const [displayedText, setDisplayedText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentWord = AUTH_TYPED_WORDS[activeWordIndex]
    let frameId = 0

    if (!isDeleting && displayedText === currentWord) {
      const timeoutId = window.setTimeout(() => {
        setIsDeleting(true)
      }, 1700)

      return () => window.clearTimeout(timeoutId)
    }

    if (isDeleting && displayedText === '') {
      frameId = window.requestAnimationFrame(() => {
        setIsDeleting(false)
        setActiveWordIndex((current) => (current + 1) % AUTH_TYPED_WORDS.length)
      })
      return () => window.cancelAnimationFrame(frameId)
    }

    const timeoutId = window.setTimeout(
      () => {
        setDisplayedText((current) =>
          isDeleting ? current.slice(0, -1) : currentWord.slice(0, current.length + 1)
        )
      },
      isDeleting ? 68 : 118
    )

    return () => window.clearTimeout(timeoutId)
  }, [activeWordIndex, displayedText, isDeleting])

  return (
    <div style={{ position: 'relative', marginBottom: 28, width: 'fit-content', marginInline: 'auto' }}>
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          gap: 4,
          marginBottom: -12,
        }}
      >
        <Image
          src="/mlogo.svg"
          alt="Muko logo"
          width={34}
          height={36}
          priority
          style={{ width: 34, height: 'auto' }}
        />
        <h1
          className="font-heading"
          style={{
            fontWeight: 500,
            fontSize: 'clamp(30px, 3vw, 40px)',
            color: '#4D302F',
            letterSpacing: '-0.015em',
            lineHeight: 1.1,
            margin: 0,
            whiteSpace: 'nowrap',
            display: 'inline-block',
            maxWidth: '100%',
            borderRight: '1.5px solid rgba(67,67,43,0.55)',
            paddingRight: 2,
            animation: 'authCaretBlink 850ms step-end infinite',
          }}
        >
          {displayedText}
        </h1>
      </div>
    </div>
  )
}
