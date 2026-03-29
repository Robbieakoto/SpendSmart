import { useEffect, useState } from 'react'
import './SplashScreen.css'

interface SplashScreenProps {
  onDone: () => void
}

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [hiding, setHiding] = useState(false)

  useEffect(() => {
    const hideTimer = setTimeout(() => setHiding(true), 2200)
    const doneTimer = setTimeout(() => onDone(), 2700)
    return () => {
      clearTimeout(hideTimer)
      clearTimeout(doneTimer)
    }
  }, [onDone])

  return (
    <div className={`splash-screen${hiding ? ' hiding' : ''}`}>
      <div className="splash-icon">
        <img src="/icon.svg" alt="SpendSmart logo" />
      </div>
      <h1 className="splash-title">
        Spend<span>Smart</span>
      </h1>
      <p className="splash-tagline">Track. Save. Thrive.</p>
      <div className="splash-dots">
        <div className="splash-dot" />
        <div className="splash-dot" />
        <div className="splash-dot" />
      </div>
    </div>
  )
}
