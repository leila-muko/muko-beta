export function AuthBackgroundPulse() {
  return (
    <>
      <div
        aria-hidden="true"
        className="auth-page-bloom auth-page-bloom-primary"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 340,
          height: 340,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        className="auth-page-bloom auth-page-bloom-secondary"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 220,
          height: 220,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        className="auth-page-ring auth-page-ring-outer"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 420,
          height: 420,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        className="auth-page-ring auth-page-ring-middle"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 320,
          height: 320,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
      <div
        aria-hidden="true"
        className="auth-page-ring auth-page-ring-inner"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 240,
          height: 240,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }}
      />
    </>
  )
}
