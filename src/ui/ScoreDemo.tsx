import { useEffect, useMemo, useRef, useState } from 'react';
import { contributions } from '../game/calc';
import { CARD_MAP } from '../game/data/cards';
import { ARCHETYPE_MAP } from '../game/data/modern';
import { ROLE_ORDER } from '../game/data/roles';
import { type Attr, type EventResult, type Player, type RoleId, type Student } from '../game/types';
import { EventCardView } from './EventCardView';
import { Playmat } from './Playmat';
import { measure, minusList, NO_RECTS, useFxClock, VARIANTS, type FxCard } from './scoreFx';
import { EVENT_MAP, cardRule } from '../game/data/events';

/*
 * 得点演出のデモ（#score-demo で開く）：
 * 「どのカードから何点入ったか」を見せるアニメーション案を、本物のカードと教室で見比べる。
 */

// ---------- サンプルのクラス ----------

let uid = 0;
function hist(id: string): Student {
  const c = CARD_MAP[id];
  return { uid: `d${uid++}`, cardId: id, name: c.name, title: c.title, era: c.era, rarity: c.rarity, icon: c.icon, art: id, attrs: [...c.attrs], flavor: c.flavor, joined: '', mvp: 0 };
}
function modern(id: string, name: string, attrs: Attr[]): Student {
  const a = ARCHETYPE_MAP[id];
  return { uid: `d${uid++}`, cardId: `m:${id}#1`, name, title: a.title, era: 'present', rarity: a.rarity, icon: a.icon, art: id, attrs, flavor: a.flavor, joined: '', mvp: 0 };
}

const STUDENTS: Student[] = [
  modern('track', '佐藤 陸', ['sports', 'sports']),
  modern('nerd', '高橋 学', ['study', 'study']),
  modern('gyaru', '田中 ゆな', ['charm']),
  modern('brass', '伊藤 奏', ['art']),
  modern('yankee', '渡辺 拳', ['fight']),
  modern('banchou', '山本 剛', ['fight', 'fight', 'fight']),
  modern('olympian', '中村 隼', ['sports', 'sports', 'sports', 'study']),
  hist('yukimura'),
  hist('keiji'),
];
const byArt = (art: string) => STUDENTS.find((s) => s.art === art)!.uid;
const ROLE_PICK: Partial<Record<RoleId, string>> = {
  study: byArt('nerd'),
  pe: byArt('yukimura'),
  culture: byArt('brass'),
  leader: byArt('gyaru'),
};
const BASE_POINTS = 42;
const PLAYER: Player = {
  id: 0,
  name: '赤井先生',
  isCpu: false,
  color: '#e85d5d',
  students: STUDENTS,
  unlocked: [...ROLE_ORDER],
  roles: ROLE_ORDER.map((role) => ({ role, uid: ROLE_PICK[role]! })),
  points: BASE_POINTS,
};

// ---------- シナリオ（めくったカード） ----------

interface Scenario {
  label: string;
  card: EventResult;
  fx: FxCard;
  normal: boolean;
}

/** 本物のカードから、めくったときの見た目と演出の材料を作る */
function scenario(id: string, label: string): Scenario {
  const c = EVENT_MAP[id];
  const rule = cardRule(c);
  const rows: EventResult['rows'] = [];
  switch (c.kind) {
    case 'normal':
      return { label, normal: true, fx: { attr: c.attr }, card: { title: c.name, icon: c.icon, attr: c.attr, tone: 'normal', desc: '', rule, rows } };
    case 'swing':
      return { label, normal: false, fx: { attr: c.plus, minus: c.minus }, card: { title: c.name, icon: c.icon, attr: c.plus, tone: 'contest', desc: c.desc, rule, rows } };
    case 'contest':
      return { label, normal: false, fx: { attr: c.attr, era: c.era }, card: { title: c.name, icon: c.icon, attr: c.attr, tone: 'era', desc: c.desc, rule, rows } };
    case 'raid':
      return {
        label,
        normal: false,
        fx: { attr: 'fight', era: c.era, threat: c.threat },
        card: { title: c.name, icon: c.icon, attr: 'fight', tone: 'era', desc: `敵の強さ ${c.threat}`, rule, rows },
      };
    default:
      throw new Error(id);
  }
}

const SCENARIOS: Scenario[] = [
  scenario('n_sports', '🏃 通常カード'),
  scenario('marathon', '🥵 共通イベント（−人数）'),
  scenario('kassen', '⚔️ 時代イベント（×2）'),
  scenario('raid_sengoku', '👊 襲来（−敵の強さ）'),
];

function readHash(): { v: number; s: number } {
  const m = /v=(\d)&s=(\d)/.exec(location.hash);
  return m ? { v: Math.min(+m[1], VARIANTS.length - 1), s: Math.min(+m[2], SCENARIOS.length - 1) } : { v: 0, s: 0 };
}

/** 案ごとに、本編で使う場面 */
const HOME_SCENARIO = [0, 2, 3, 1];

export function ScoreDemo() {
  const [v, setV] = useState(() => readHash().v);
  const [s, setS] = useState(() => readHash().s);
  const [run, setRun] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const sc = SCENARIOS[s];
  const variant = VARIANTS[v];
  const fx = sc.fx;
  const list = useMemo(() => contributions(PLAYER, fx.attr, fx.era), [fx]);
  const minus = useMemo(() => (fx.minus ? minusList(STUDENTS, fx.minus === 'heads' ? null : contributions(PLAYER, fx.minus)) : []), [fx]);
  const total = list.reduce((a, x) => a + x.pts, 0);
  const delta = fx.threat !== undefined ? total - fx.threat : total - minus.reduce((a, x) => a + x.pts, 0);
  const base = { start: 700, list, minusList: minus, card: fx, delta, total, all: STUDENTS.map((x) => x.uid) };
  const clock = useFxClock(`${v}-${s}-${run}`, variant.length(base), () => measure(root.current!, '.demo-mat', '.demo-ecard .ecard'), NO_RECTS);
  const frame = variant.run({ ...base, t: clock.t, rects: clock.rects });

  useEffect(() => {
    history.replaceState(null, '', `#score-demo?v=${v}&s=${s}`);
  }, [v, s]);

  const player: Player = { ...PLAYER, points: BASE_POINTS + frame.gained };

  return (
    <div className="score-demo" ref={root}>
      <header className="demo-head">
        <h2>得点演出のデモ</h2>
        <div className="demo-tabs">
          {VARIANTS.map((x, i) => (
            <button key={x.id} className={`btn small ${i === v ? 'primary' : 'ghost'}`} onClick={() => (setV(i), setS(HOME_SCENARIO[i]), setRun((r) => r + 1))}>
              {x.name}
            </button>
          ))}
        </div>
        <div className="demo-tabs">
          {SCENARIOS.map((x, i) => (
            <button key={x.label} className={`btn small ${i === s ? 'primary' : 'ghost'}`} onClick={() => (setS(i), setRun((r) => r + 1))}>
              {x.label}
            </button>
          ))}
          <button className="btn small" onClick={() => setRun((r) => r + 1)}>
            ↻ もう一度
          </button>
        </div>
        <p className="demo-desc">{variant.desc}</p>
      </header>
      <div className="demo-board">
        <div className="demo-ecard">
          <EventCardView key={`${s}-${run}`} result={sc.card} />
        </div>
        {frame.side}
      </div>
      <div className="demo-mat">
        <Playmat
          player={player}
          year={1}
          slots={6}
          variant="near"
          acting
          delta={frame.done ? delta : undefined}
          lit={frame.lit}
          dimUid={(u) => frame.dim.has(u)}
        />
      </div>
      <div className="fx-layer">{frame.overlay}</div>
      <p className="demo-legend">係に就いた子（係ボードの下に係アイコン）はそのアイコンが×2。時代イベントと襲来では、その時代（ここでは戦国）出身の子が×2。</p>
    </div>
  );
}
