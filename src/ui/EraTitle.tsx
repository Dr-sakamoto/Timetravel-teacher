import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ERAS } from '../game/data/eras';
import { MONTHS, currentEra, termOfMonth } from '../game/engine';
import type { GameState } from '../game/types';

/** 帯が出ている時間（ms） */
const SHOW = 1600;

/** 時代が明けたときの幕間：'plunge'=渦へ突っ込んでいる 'band'=時代名の帯が出ている */
export interface EraIntro {
  key: number;
  era: number;
  term: number;
  stage: 'plunge' | 'band';
}

/**
 * 時代と時代のあいだ（初期メンバー決め・係決め）が終わった瞬間から、渦へ突っ込み（風景を出していれば delay ms）、
 * 時代名の帯を見せ終わるまでの幕間。そのあいだは卓の中央を隠し、CPUも待たせる
 */
export function useEraIntro(state: GameState, delay: number): EraIntro | null {
  const between = state.phase.kind === 'memberDraw' || state.phase.kind === 'roles';
  const was = useRef(between);
  const [intro, setIntro] = useState<EraIntro | null>(null);

  useEffect(() => {
    const opened = was.current && !between;
    was.current = between;
    if (!opened) return;
    const era = currentEra(state);
    const term = Math.max(1, termOfMonth(MONTHS[Math.min(state.monthIdx, MONTHS.length - 1)]));
    setIntro({ key: Date.now(), era, term, stage: delay ? 'plunge' : 'band' });
    const t1 = setTimeout(() => setIntro((x) => x && { ...x, stage: 'band' }), delay);
    const t2 = setTimeout(() => setIntro(null), delay + SHOW);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      setIntro(null);
    };
    // 合図は「あいだ」が終わった瞬間だけ
  }, [between]);

  return intro;
}

/** 時代が明けた最初だけ、卓の上に「1学期 古代エジプト」の帯を重ねて出す */
export function EraTitle({ intro }: { intro: EraIntro | null }) {
  if (intro?.stage !== 'band') return null;
  const e = ERAS[intro.era];
  return (
    <div key={intro.key} className="era-band" style={{ '--era': e.color } as CSSProperties} aria-live="polite">
      <div className="era-band-inner">
        <span className="era-band-term">{intro.term}学期</span>
        <span className="era-band-icon">{e.icon}</span>
        <b className="era-band-name">{e.name}</b>
        <span className="era-band-when">{e.when}</span>
      </div>
    </div>
  );
}
