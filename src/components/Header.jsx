import ProgressIndicator from './ProgressIndicator';

// onWorlds makes the progress indicator a button (opens world select).
// headerRef lets screen transitions fade the header in and out.
export default function Header({ headerRef, onBack, worlds, onWorlds }) {
  return (
    <header className="header" ref={headerRef}>
      <button className="icon-button" onClick={onBack} aria-label="Back">
        <svg width="20" height="20" viewBox="0 0 20 20">
          <path d="M12.5 3.5 6 10l6.5 6.5" className="fill-none stroke-outline" style={{ strokeWidth: 1.8 }} />
        </svg>
      </button>
      {worlds &&
        (onWorlds ? (
          <button className="progress-button" onClick={onWorlds} aria-label="Worlds">
            <ProgressIndicator worlds={worlds} />
          </button>
        ) : (
          <ProgressIndicator worlds={worlds} />
        ))}
    </header>
  );
}
