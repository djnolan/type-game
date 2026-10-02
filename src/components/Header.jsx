import ProgressIndicator from './ProgressIndicator';

export default function Header({ onBack, worlds }) {
  return (
    <header className="header">
      <button className="icon-button" onClick={onBack} aria-label="Back">
        <svg width="20" height="20" viewBox="0 0 20 20">
          <path d="M12.5 3.5 6 10l6.5 6.5" className="fill-none stroke-outline" style={{ strokeWidth: 1.8 }} />
        </svg>
      </button>
      {worlds && <ProgressIndicator worlds={worlds} />}
    </header>
  );
}
