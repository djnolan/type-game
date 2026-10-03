import { useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import Stage from '../components/Stage';
import WorldSwitcher from '../components/WorldSwitcher';
import { getLevel, getWorld, levels, validateLevel, worlds } from '../lib/data';
import { emptyDraft, loadDraft, saveDraft } from '../lib/draft';
import { letterVisible, regrid } from '../lib/geometry';
import { useSize } from '../lib/useSize';
import { getShape, setShape } from '../lib/shape';
import { getTheme, setTheme } from '../lib/theme';
import '../editor.css';

export function formatLevel({ id, world, scale, letters }) {
  const rows = letters.map((l) => `    { "char": "${l.char}", "x": ${l.x}, "y": ${l.y} }`);
  return [
    '{',
    `  "id": ${JSON.stringify(id)},`,
    `  "world": ${world},`,
    `  "scale": ${scale},`,
    `  "letters": [${rows.length ? `\n${rows.join(',\n')}\n  ` : ''}]`,
    '}',
    '',
  ].join('\n');
}

// Dev-only level editor. Build a composition on the canvas, preview it in the
// target circle, and export JSON to drop into src/data/levels/.
export default function Editor() {
  const [level, setLevel] = useState(() => loadDraft() ?? emptyDraft());
  const [json, setJson] = useState(() => formatLevel(level));
  const [jsonError, setJsonError] = useState(null);
  const [theme, setThemeState] = useState(getTheme);
  const [shape, setShapeState] = useState(getShape);
  const [notice, setNotice] = useState(null);
  const [hostRef, size] = useSize();
  const fileRef = useRef(null);

  const world = getWorld(level.world) ?? worlds[0];

  useEffect(() => {
    saveDraft(level);
    setJson(formatLevel(level));
    setJsonError(null);
  }, [level]);

  const update = (patch) => setLevel((l) => ({ ...l, ...patch }));

  // Switching world keeps the composition: letters move to the matching points
  // on the new grid. Positions always come from the last hand-placed layout, so
  // flipping through worlds doesn't pile up rounding.
  const placed = useRef(null);
  const setLetters = (letters) => {
    placed.current = null;
    update({ letters });
  };

  function switchWorld(n) {
    const next = getWorld(n);
    if (!next || n === level.world) return;
    placed.current ??= { letters: level.letters, grid: world.grid };
    update({ world: n, letters: regrid(placed.current.letters, placed.current.grid, next.grid) });
  }

  function load(next) {
    const errors = validateLevel(next);
    if (errors.length) {
      setJsonError(errors.join('; '));
      return false;
    }
    placed.current = null;
    setLevel({ id: next.id, world: next.world, scale: next.scale, letters: next.letters.map(({ char, x, y }) => ({ char, x, y })) });
    return true;
  }

  function applyJson() {
    try {
      load(JSON.parse(json));
    } catch (e) {
      setJsonError(e.message);
    }
  }

  async function importFile(e) {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      load(JSON.parse(await file.text()));
    } catch (err) {
      setJsonError(err.message);
    }
  }

  function download() {
    const url = URL.createObjectURL(new Blob([formatLevel(level)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${level.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(formatLevel(level));
      flash('Copied');
    } catch {
      flash('Copy failed');
    }
  }

  function flash(text) {
    setNotice(text);
    setTimeout(() => setNotice(null), 1500);
  }

  const hidden = level.letters.filter((l) => !letterVisible(world.glyphs, l, level.scale, world.grid, shape));
  const errors = validateLevel(level);
  const clash = getLevel(level.id);

  return (
    <div className="editor">
      <div className="editor-stage">
        <Header onBack={() => (location.hash = '')} />
        <div className="stage-host" ref={hostRef}>
          {size && (
            <Stage
              width={size.width}
              height={size.height}
              glyphs={world.glyphs}
              grid={world.grid}
              scale={level.scale}
              letters={level.letters}
              onLettersChange={setLetters}
              target={level.letters}
              checkable={false}
              shape={shape}
            />
          )}
        </div>
      </div>

      <div className="editor-panel">
        <h1>Level editor</h1>

        <section>
          <label>
            Open
            <select value="" onChange={(e) => e.target.value && load(getLevel(e.target.value))}>
              <option value="">Choose a level…</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.id}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              placed.current = null;
              setLevel({ ...emptyDraft(), world: level.world });
            }}
          >
            New
          </button>
        </section>

        <section className="fields">
          <label>
            ID
            <input value={level.id} onChange={(e) => update({ id: e.target.value.trim() })} />
          </label>
          <div className="wide">
            World
            <WorldSwitcher value={world.world} onChange={switchWorld} />
          </div>
          <label className="wide">
            Letter scale <span className="hint">cap height ÷ circle diameter</span>
            <div className="row">
              <input
                type="range"
                min="0.2"
                max="1.8"
                step="0.01"
                value={level.scale}
                onChange={(e) => update({ scale: Number(e.target.value) })}
              />
              <input
                type="number"
                min="0.05"
                step="0.01"
                value={level.scale}
                onChange={(e) => e.target.value > 0 && update({ scale: Number(e.target.value) })}
              />
            </div>
          </label>
        </section>

        <section>
          <div className="letters">
            {level.letters.length ? (
              level.letters.map((l) => (
                <span key={l.char} className={hidden.includes(l) ? 'warn' : ''}>
                  {l.char} {l.x},{l.y}
                </span>
              ))
            ) : (
              <span className="hint">Pull letters up from the tray onto the canvas.</span>
            )}
          </div>
          {hidden.length > 0 && (
            <p className="warn">Fully outside the {shape}, so players can’t see: {hidden.map((l) => l.char).join(', ')}</p>
          )}
          {errors.length > 0 && <p className="warn">{errors.join('; ')}</p>}
          {clash && <p className="hint">Same ID as an existing level. Exporting will replace {clash.id}.json.</p>}
          <button onClick={() => setLetters([])}>Clear canvas</button>
        </section>

        <section>
          <textarea value={json} spellCheck={false} onChange={(e) => setJson(e.target.value)} rows={12} />
          {jsonError && <p className="warn">{jsonError}</p>}
          <div className="row">
            <button onClick={applyJson}>Apply JSON</button>
            <button onClick={() => fileRef.current.click()}>Import file…</button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
          </div>
          <div className="row">
            <button onClick={download}>Download {level.id}.json</button>
            <button onClick={copy}>Copy JSON</button>
            {notice && <span className="hint">{notice}</span>}
          </div>
          <p className="hint">Save exported files to src/data/levels/. Levels play in file-name order.</p>
        </section>

        <section>
          <button disabled={!level.letters.length} onClick={() => (location.hash = '#/play/draft')}>
            Play test
          </button>
          <label>
            Theme
            <select
              value={theme}
              onChange={(e) => {
                setTheme(e.target.value);
                setThemeState(e.target.value);
              }}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label>
            Board shape <span className="hint">temporary test</span>
            <select
              value={shape}
              onChange={(e) => {
                setShape(e.target.value);
                setShapeState(e.target.value);
              }}
            >
              <option value="circle">Circle</option>
              <option value="square">Square</option>
            </select>
          </label>
        </section>
      </div>
    </div>
  );
}
