import './SplashScreen.css'

export default function SplashScreen() {
  return (
    <div className="splash-screen">
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
