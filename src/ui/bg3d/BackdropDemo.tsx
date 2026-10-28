import { useEffect, useRef, useState } from 'react';
import { ERAS } from '../../game/data/eras';
import { ERA_CARDS } from '../../game/data/events';
import type { EraId } from '../../game/types';
import type { Backdrop } from './engine';
import type { Cue } from './kit';

/** 時代の風景の見本（#bg3d。#bg3d/egypt のように時代を指定して開ける）：時代を切り替え、イベントの演出やゲームの様子を試す */
export function BackdropDemo() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [bd, setBd] = useState<Backdrop | null>(null);
  const first = (location.hash.split('/')[1] as EraId | undefined) ?? 'egypt';
  const [cue, setCue] = useState<Cue>({ era: ERAS.some((e) => e.id === first) ? first : 'egypt', warp: false, pyramid: null, kaguya: null, patent: false, sunflower: 0, oath: false, plague: false });

  useEffect(() => {
    let made: Backdrop | null = null;
    import('./engine').then(({ Backdrop }) => {
      if (!canvas.current) return;
      made = new Backdrop(canvas.current);
      setBd(made);
    });
    return () => made?.dispose();
  }, []);
  useEffect(() => bd?.update(cue), [bd, cue]);

  const set = (x: Partial<Cue>) => setCue((c) => ({ ...c, ...x }));
  const events = ERA_CARDS.filter((c) => c.era === cue.era);
  const py = cue.pyramid;

  return (
    <div className="bg3d-demo">
      <canvas ref={canvas} className="bg3d" />
      <div className="bg3d-panel">
        <div>
          {ERAS.map((e) => (
            <button key={e.id} className={`btn small ${e.id === cue.era ? '' : 'ghost'}`} onClick={() => set({ era: e.id })}>
              {e.icon} {e.name}
            </button>
          ))}
        </div>
        <div>
          <button className={`btn small ${cue.warp ? '' : 'ghost'}`} onClick={() => set({ warp: !cue.warp })}>
            🌀 {cue.warp ? '次の時代へ突っ込む' : 'タイムスリップ'}
          </button>
          {events.map((c) => (
            <button key={c.id} className="btn small ghost" onClick={() => bd?.fire(c.id)}>
              {c.icon} {c.name}
            </button>
          ))}
          <button className="btn small ghost" onClick={() => bd?.fire('graduation')}>
            🎓 卒業式
          </button>
        </div>
        {cue.era === 'egypt' && (
          <div>
            🔺 ピラミッド
            <button className="btn small ghost" onClick={() => set({ pyramid: null })}>なし</button>
            <button className="btn small ghost" onClick={() => set({ pyramid: { progress: Math.min(1, (py?.progress ?? 0) + 0.15), done: false } })}>石を積む</button>
            <button className="btn small ghost" onClick={() => set({ pyramid: { progress: 1, done: true } })}>完成</button>
          </div>
        )}
        {cue.era === 'heian' && (
          <div>
            🌙 かぐや姫
            <button className="btn small ghost" onClick={() => set({ kaguya: { offered: 0, total: 5 } })}>来る</button>
            <button className="btn small ghost" onClick={() => set({ kaguya: cue.kaguya && { ...cue.kaguya, offered: Math.min(5, cue.kaguya.offered + 1) } })}>宝を差し出す</button>
            <button className="btn small ghost" onClick={() => set({ kaguya: null })}>月へ帰る</button>
          </div>
        )}
        {cue.era === 'modern' && (
          <div>
            <button className="btn small ghost" onClick={() => set({ patent: !cue.patent })}>💡 特許 {cue.patent ? 'あり' : 'なし'}</button>
            <button className="btn small ghost" onClick={() => set({ sunflower: (cue.sunflower + 1) % 3 })}>🌻 飾った絵 {cue.sunflower}</button>
          </div>
        )}
        {cue.era === 'china' && <button className="btn small ghost" onClick={() => set({ oath: !cue.oath })}>🍑 桃園の誓い {cue.oath ? 'あり' : 'なし'}</button>}
        {cue.era === 'europe' && <button className="btn small ghost" onClick={() => set({ plague: !cue.plague })}>🐀 ペスト {cue.plague ? 'あり' : 'なし'}</button>}
      </div>
    </div>
  );
}
