import { useEffect, useMemo, useRef, useState } from 'react';
import { contributions } from '../game/calc';
import { CARD_MAP } from '../game/data/cards';
import { ARCHETYPE_MAP } from '../game/data/modern';
import { ROLE_ORDER } from '../game/data/roles';
import { type Attr, type EraId, type EventResult, type Player, type RoleId, type Student } from '../game/types';
import { EventCardView } from './EventCardView';
import { Playmat } from './Playmat';
import { measure, NO_RECTS, useFxClock, VARIANTS, type FxCard } from './scoreFx';

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
  modern('baseball', '鈴木 翔', ['study', 'sports']),
  modern('nerd', '高橋 学', ['study', 'study']),
  modern('gyaru', '田中 ゆな', ['charm']),
  modern('brass', '伊藤 奏', ['art']),
  modern('yankee', '渡辺 拳', ['fight']),
  modern('banchou', '山本 剛', ['fight', 'fight', 'fight']),
  modern('olympian', '中村 隼', ['sports', 'sports', 'sports', 'study']),
  hist('yukimura'),
  hist('keiji'),
  hist('nobunaga'),
];
const byArt = (art: string) => STUDENTS.find((s) => s.art === art)!.uid;
const ROLE_PICK: Partial<Record<RoleId, string>> = {
  study: byArt('nerd'),
  pe: byArt('yukimura'),
  culture: byArt('brass'),
  leader: byArt('nobunaga'),
};
const BASE_POINTS = 42;
const PLAYER: Player = {
  id: 0,
  name: '赤井先生',
  isCpu: false,
  color: '#e85d5d',
  students: STUDENTS,
  roles: ROLE_ORDER.map((r) => ROLE_PICK[r] ?? null),
  points: BASE_POINTS,
};

// ---------- シナリオ（めくったカード） ----------

interface Scenario {
  id: string;
  label: string;
  card: EventResult;
  attr: Attr;
  mode: 'sum' | 'best';
  era?: EraId;
  threat?: number;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'contest',
    label: '🏃 体育祭（合計）',
    attr: 'sports',
    mode: 'sum',
    card: { title: '体育祭', icon: '🏃', attr: 'sports', tone: 'contest', desc: 'リレーに綱引き！', rule: '引いた人：クラス全員の🏃の数を加点', rows: [] },
  },
  {
    id: 'era',
    label: '⚔️ 合戦（時代×2）',
    attr: 'fight',
    mode: 'sum',
    era: 'sengoku',
    card: { title: '天下分け目の合戦', icon: '⚔️', attr: 'fight', tone: 'era', desc: '関ヶ原で全軍激突！', rule: '引いた人：クラス全員の👊の数を加点（この時代の生徒は2倍）', rows: [] },
  },
  {
    id: 'normal',
    label: '📚 授業（一番の子）',
    attr: 'study',
    mode: 'best',
    card: { title: '授業', icon: '📚', attr: 'study', tone: 'normal', desc: '', rule: '全員：📚を一番多く持つ子の個数を加点', rows: [] },
  },
  {
    id: 'raid',
    label: '👊 カチコミ（マイナス）',
    attr: 'fight',
    mode: 'sum',
    threat: 7,
    card: { title: 'カチコミ！他校のヤンキー', icon: '😠', attr: 'fight', tone: 'contest', desc: '敵の強さ 7', rule: '引いた人：クラスの👊の数が7に足りない分だけマイナス', rows: [] },
  },
];

function readHash(): { v: number; s: number } {
  const m = /v=(\d)&s=(\d)/.exec(location.hash);
  return m ? { v: Math.min(+m[1], VARIANTS.length - 1), s: Math.min(+m[2], SCENARIOS.length - 1) } : { v: 0, s: 2 };
}

/** 案ごとに、本編で使う場面 */
const HOME_SCENARIO = [2, 1, 3, 0];

export function ScoreDemo() {
  const [v, setV] = useState(() => readHash().v);
  const [s, setS] = useState(() => readHash().s);
  const [run, setRun] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const sc = SCENARIOS[s];
  const variant = VARIANTS[v];
  const list = useMemo(() => contributions(PLAYER, sc.attr, sc.mode, sc.era), [sc]);
  const total = list.reduce((a, x) => a + x.pts, 0);
  const delta = sc.threat !== undefined ? Math.min(0, total - sc.threat) : total;
  const card: FxCard = { attr: sc.attr, era: sc.era, threat: sc.threat };
  const base = { start: 700, list, card, delta, total, all: STUDENTS.map((x) => x.uid) };
  const clock = useFxClock(`${v}-${s}-${run}`, variant.length(base), () => measure(root.current!, sc.attr, '.demo-mat', '.demo-ecard .ecard'), NO_RECTS);
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
            <button key={x.id} className={`btn small ${i === s ? 'primary' : 'ghost'}`} onClick={() => (setS(i), setRun((r) => r + 1))}>
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
      <p className="demo-legend">係に就いた子（係ボードの下に係アイコン）はそのアイコンが×2。合戦では戦国出身の子が×2。</p>
    </div>
  );
}
