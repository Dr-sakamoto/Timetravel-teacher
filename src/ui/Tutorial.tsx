import { useEffect, useState } from 'react';
import { MAX_CLASS, STARTING_MEMBERS } from '../game/calc';
import { inGuerrilla, slotsNow } from '../game/engine';
import type { GameState } from '../game/types';

/**
 * チュートリアル：体験版（「まず遊んでみる」）で、はじめて出会う場面ごとにヒントの吹き出しを出す。
 * 1つずつ出し、「わかった」で閉じるか、その場面が終わったら見たことにする。見たものは端末に覚える
 */
const TIPS_KEY = 'timetravel-teacher-tips';

interface TipsSave {
  /** ヒントを出さない */
  off: boolean;
  seen: string[];
}

function loadTips(): TipsSave {
  try {
    const raw = localStorage.getItem(TIPS_KEY);
    if (raw) return { off: false, seen: [], ...(JSON.parse(raw) as Partial<TipsSave>) };
  } catch {
    /* 読めない環境では毎回はじめから */
  }
  return { off: false, seen: [] };
}

function saveTips(t: TipsSave) {
  try {
    localStorage.setItem(TIPS_KEY, JSON.stringify(t));
  } catch {
    /* 保存できない環境では何もしない */
  }
}

/** 体験版を新しく始めたら、ヒントをはじめから出し直す（「ヒントを消す」にしていたらそのまま） */
export function resetTips() {
  saveTips({ ...loadTips(), seen: [] });
}

interface Tip {
  id: string;
  title: string;
  body: string;
  /** この場面で出すか（me は手前に座っている人間の席） */
  when: (s: GameState, me: number, seen: (id: string) => boolean) => boolean;
}

const myTurn = (s: GameState, me: number) => s.phase.kind === 'draw' && s.phase.player === me;

/** 出す順（上から、まだ見ていなくて場面が合うものを1つ） */
const TIPS: Tip[] = [
  {
    id: 'welcome',
    title: 'ようこそ、先生！',
    body: `あなたは担任の先生。偉人や恐竜を自分のクラスに転校させて、クラスポイントを一番ためたクラスの勝ち！まずは光っている「現代の生徒」の山をタップして、最初の${STARTING_MEMBERS}人を1枚ずつ引こう（自分の番のときだけ引ける）。`,
    when: (s) => s.phase.kind === 'memberDraw',
  },
  {
    id: 'roles',
    title: '係を決めよう',
    body: '手前の教室の左にある「係の場」のうち🆕をタップして係を1つ解放し、生徒のカードをドラッグ（またはカードをタップ→置き場をタップ）して置こう。係に就いた子は、その係のアイコンが2倍に数えられる。迷ったら「おまかせ」→「決定」。',
    when: (s, me) => s.phase.kind === 'roles' && !s.phase.ready[me],
  },
  {
    id: 'turn',
    title: 'あなたの番',
    body: '卓の中央の場に並んだカードから1枚取る。カードをタップすると効果が出るので「取る」で決定。「無料」の授業カード（📚🏃🎨🙋）は、クラス全員のそのアイコンの数だけその場で点が入る。',
    when: (s, me) => myTurn(s, me),
  },
  {
    id: 'score',
    title: '点が入った！',
    body: '入った点は名札の数字に足される。光っているのは点に関わった生徒。「次へ」で進もう。',
    when: (s, me) => s.phase.kind === 'result' && s.phase.ctx === 'turn' && s.phase.player === me,
  },
  {
    id: 'buy',
    title: '人物カードで戦力アップ',
    body: `値段が書いてあるカードは、クラスポイントを払って取る。人物カードを取るとその子が転校してくる（アイコンが多い子ほど高いけど、そのぶん授業で稼げる）。教室は${MAX_CLASS}席。今すぐ点を取るか、点を払って将来の戦力を買うかが悩みどころ。`,
    when: (s, me, seen) => myTurn(s, me) && seen('turn') && s.market.some((id) => id.startsWith('person:')),
  },
  {
    id: 'guerrilla',
    title: 'ゲリラ発生！',
    body: '場を補充するときに山札からイベントがめくれると、学校全体でその場で起こる（だれも避けられない）。時代ごとに、ものを言うアイコンが違う。いまの時代は上のバーで確かめられる。',
    when: (s) => inGuerrilla(s),
  },
  {
    id: 'pick',
    title: '選んで決める',
    body: '光っている生徒や、上の相手の名札をタップして選ぼう。選んだら卓の中央のボタンで決定。やめるときは「やめる」。',
    when: (s, me) => {
      const k = s.phase.kind;
      return (k === 'makeRoom' || k === 'kachikomi' || k === 'exchange' || k === 'equip' || k === 'cyborg' || k === 'push' || k === 'gift') && s.phase.player === me;
    },
  },
  {
    id: 'peek',
    title: 'ライバルの教室',
    body: '上の名札は、ほかのクラス（CPUの先生）。タップすると、その教室にどんな子がいるか見られる。ルールをまとめて見たいときは右上の❓。',
    when: (s, me, seen) => myTurn(s, me) && seen('buy'),
  },
  {
    id: 'unlock',
    title: '新しい学期・新しい係',
    body: '学期が変わると別の時代へタイムスリップ（手番は点の低いクラスから）。学期の頭には、まだ解放していない係を1つ選んで増やせる。自分のクラスに多いアイコンの係を選ぶとお得。解放した係はずっと使える。',
    when: (s, me, seen) => s.phase.kind === 'roles' && !s.phase.ready[me] && seen('roles') && slotsNow(s) > s.players[me].unlocked.length,
  },
];

/** ヒントを出すかの切り替え（上のバーの💡） */
export function useTipsPref(): [boolean, () => void] {
  const [on, setOn] = useState(() => !loadTips().off);
  const toggle = () =>
    setOn((v) => {
      saveTips({ ...loadTips(), off: v });
      return !v;
    });
  return [on, toggle];
}

export function Tutorial({ state, me, onOff }: { state: GameState; me: number; onOff: () => void }) {
  const [seen, setSeen] = useState(() => new Set(loadTips().seen));
  const tip = TIPS.find((t) => !seen.has(t.id) && t.when(state, me, (id) => seen.has(id))) ?? null;
  const [shown, setShown] = useState<string | null>(null);

  const markSeen = (id: string) =>
    setSeen((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      saveTips({ ...loadTips(), seen: [...next] });
      return next;
    });

  // 出していたヒントの場面が終わったら、見たことにする（閉じなくても次の場面で同じヒントは出ない）
  useEffect(() => {
    if (shown && shown !== tip?.id) markSeen(shown);
    setShown(tip?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tip?.id]);

  if (!tip) return null;
  return (
    <div className="tip" role="status">
      <div className="tip-head">
        <span className="tip-step">💡 チュートリアル</span>
        <b>{tip.title}</b>
      </div>
      <p>{tip.body}</p>
      <div className="tip-actions">
        <button className="btn small ghost" onClick={onOff} title="上のバーの💡で、また出せる">
          ヒントを消す
        </button>
        <button className="btn small primary" onClick={() => markSeen(tip.id)}>
          わかった
        </button>
      </div>
    </div>
  );
}
