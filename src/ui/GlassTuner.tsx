import { useEffect, useState } from 'react';

const KEY = 'ttt.glass';
/** いまの既定（色 4・すりガラス 1 ＝ 色36%・ぼかし2.5px・くもり3%） */
const DEFAULT = { tint: 4, frost: 1 };

/** 段階（1〜10）から CSS の値へ。色は1段9%、すりガラスは1段ぼかし2.5px＋白いくもり3% */
function apply(v: { tint: number; frost: number } | null) {
  const s = document.documentElement.style;
  if (!v) {
    s.removeProperty('--glass-tint');
    s.removeProperty('--glass-blur');
    s.removeProperty('--glass-haze');
    return;
  }
  s.setProperty('--glass-tint', `${v.tint * 9}%`);
  s.setProperty('--glass-blur', `${v.frost * 2.5}px`);
  s.setProperty('--glass-haze', String(v.frost * 0.03));
}

/** すりガラスの色の濃さ・すりガラスの濃さを、遊びながらスライダーで試す（URLの最後に #glass を付けたときだけ出る） */
export function GlassTuner() {
  const [v, setV] = useState(() => {
    try {
      return { ...DEFAULT, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } as typeof DEFAULT;
    } catch {
      return DEFAULT;
    }
  });
  useEffect(() => {
    apply(v);
    try {
      localStorage.setItem(KEY, JSON.stringify(v));
    } catch {
      // 覚えられなくても、今の画面では効く
    }
  }, [v]);
  useEffect(() => () => apply(null), []);
  const [open, setOpen] = useState(true);

  if (!open)
    return (
      <button className="glass-tuner glass-tuner-min" onClick={() => setOpen(true)} title="すりガラスの調整を開く">
        🎛 色{v.tint}・すりガラス{v.frost}
      </button>
    );
  return (
    <div className="glass-tuner">
      <label htmlFor="glass-tint">色の濃さ</label>
      <input id="glass-tint" type="range" min={1} max={10} step={1} value={v.tint} onChange={(e) => setV({ ...v, tint: Number(e.target.value) })} />
      <output htmlFor="glass-tint">{v.tint}</output>
      <label htmlFor="glass-frost">すりガラス</label>
      <input id="glass-frost" type="range" min={1} max={10} step={1} value={v.frost} onChange={(e) => setV({ ...v, frost: Number(e.target.value) })} />
      <output htmlFor="glass-frost">{v.frost}</output>
      <div className="glass-tuner-foot">
        <span>
          色{v.tint * 9}%・ぼかし{v.frost * 2.5}px・くもり{Math.round(v.frost * 3)}%
        </span>
        <span>
          <button onClick={() => setV(DEFAULT)}>既定に戻す</button> <button onClick={() => setOpen(false)}>たたむ</button>
        </span>
      </div>
    </div>
  );
}
