import { ERAS } from '../game/data/eras';
import { DECK_GROUPS, currentEra, deckBreakdown, type DeckGroup, type DeckRow } from '../game/engine';
import type { GameState } from '../game/types';

const GROUP_NOTE: Record<DeckGroup, string> = {
  通常: '場から取る（無料）：クラス全員のそのアイコンの数',
  カチコミ: '場から取る（無料）：他のクラスを1つ選び、自分の👊の数 − 相手の👊の数だけ減点、その半分を自分に加点（ドレイン）',
  共通イベント: 'ゲリラ・全クラス：状況でプラスにもマイナスにも',
  '転校・クラス替え': '転校はゲリラ（全クラスが1人ずつ外す）／クラス替えは場から取る（無料）',
  グッズ: '場から取る（ポイントを払う）：生徒1人に装備してアイコン＋1',
  時代イベント: 'ゲリラ・全クラス：カードごとに効果が違う',
  人物: '場から取る（アイコンの数に応じてポイントを払う）：自分のクラスに転入',
};

/** 今学期の山札の内訳（残り枚数と捨て札の枚数） */
export function DeckInfo({ state, onClose }: { state: GameState; onClose: () => void }) {
  const era = ERAS[currentEra(state)];
  const rows = deckBreakdown(state);
  const groups = DECK_GROUPS.filter((g) => rows.some((r) => r.group === g));
  const sum = (rs: DeckRow[]) => rs.reduce((a, r) => a + r.left + r.open + r.used, 0);
  const total = sum(rows);
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="閉じる">
          ✕
        </button>
        <h2>
          {era.icon}
          {era.name}の山札
        </h2>
        <p className="deck-motto">「{era.motto}」</p>
        <p>
          山札の残り {state.eventDeck.length}枚／場 {state.market.length}枚／捨て札 {state.discard.length}枚（合わせて {total}枚。装備されたグッズと転入した人物は含まない）
        </p>
        <table className="deck-table">
          <thead>
            <tr>
              <th>カード</th>
              <th>残り</th>
              <th>場</th>
              <th>捨て札</th>
            </tr>
          </thead>
          {groups.map((g) => {
            const rs = rows.filter((r) => r.group === g);
            const n = sum(rs);
            return (
              <tbody key={g}>
                <tr className="deck-group">
                  <th colSpan={4}>
                    {g} {n}枚（{Math.round((n / total) * 100)}%）<span className="deck-note">{GROUP_NOTE[g]}</span>
                  </th>
                </tr>
                {rs.map((r) => (
                  <tr key={r.name} className={r.left === 0 ? 'deck-empty' : ''}>
                    <td>
                      {r.icon}
                      {r.name}
                    </td>
                    <td>{r.left}</td>
                    <td>{r.open}</td>
                    <td>{r.used}</td>
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}
