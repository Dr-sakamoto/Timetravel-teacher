import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ERAS } from '../game/data/eras';
import { MONTHS, currentEra, termOfMonth } from '../game/engine';
import type { GameState } from '../game/types';

/** 帯が出ている時間（ms） */
const SHOW = 2800;

/**
 * 時代が明けた最初だけ、卓の上に「1学期 古代エジプト」の帯を重ねて出す。
 * 時代と時代のあいだ（初期メンバー決め・係決め）が終わった瞬間が合図。風景を出していれば、渦へ突っ込み終わるのを待ってから出す
 */
export function EraTitle({ state, delay }: { state: GameState; delay: number }) {
  const between = state.phase.kind === 'memberDraw' || state.phase.kind === 'roles';
  const was = useRef(between);
  const [shown, setShown] = useState<{ key: number; era: number; term: number } | null>(null);

  useEffect(() => {
    const opened = was.current && !between;
    was.current = between;
    if (!opened) return;
    const era = currentEra(state);
    const term = Math.max(1, termOfMonth(MONTHS[Math.min(state.monthIdx, MONTHS.length - 1)]));
    const t1 = setTimeout(() => setShown({ key: Date.now(), era, term }), delay);
    const t2 = setTimeout(() => setShown(null), delay + SHOW);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // 合図は「あいだ」が終わった瞬間だけ
  }, [between]);

  if (!shown) return null;
  const e = ERAS[shown.era];
  return (
    <div key={shown.key} className="era-band" style={{ '--era': e.color } as CSSProperties} aria-live="polite">
      <div className="era-band-inner">
        <span className="era-band-term">{shown.term}学期</span>
        <span className="era-band-icon">{e.icon}</span>
        <b className="era-band-name">{e.name}</b>
        <span className="era-band-when">{e.when}</span>
      </div>
    </div>
  );
}
