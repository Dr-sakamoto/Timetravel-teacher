import { ERAS } from '../game/data/eras';
import { DECK_GROUPS, currentEra, deckBreakdown, type DeckGroup, type DeckRow } from '../game/engine';
import type { GameState } from '../game/types';

const GROUP_NOTE: Record<DeckGroup, string> = {
  通常: 'めくった人：クラス全員のそのアイコンの数',
  カチコミ: 'めくった人：他のクラスを自分の👊の数だけ減点',
  共通イベント: '全クラス：状況でプラスにもマイナスにも',
  '転校・クラス替え': 'めくった人：生徒を押しつける／入れ替える',
  グッズ: '生徒1人に装備してアイコン＋1',
  時代イベント: '全クラス：この時代の子は2倍。大当たりも大損もある',
  人物: 'めくった人のクラスに転入',
};

/** 今学期の山札の内訳（残り枚数と捨て札の枚数） */
export function DeckInfo({ state, onClose }: { state: GameState; onClose: () => void }) {
  const era = ERAS[currentEra(state)];
  const rows = deckBreakdown(state);
  const groups = DECK_GROUPS.filter((g) => rows.some((r) => r.group === g));
  const sum = (rs: DeckRow[]) => rs.reduce((a, r) => a + r.left + r.used, 0);
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
        <p>
          山札の残り {state.eventDeck.length}枚／捨て札 {state.discard.length}枚（合わせて {total}枚。装備されたグッズと転入した人物は含まない）
        </p>
        <table className="deck-table">
          <thead>
            <tr>
              <th>カード</th>
              <th>残り</th>
              <th>捨て札</th>
            </tr>
          </thead>
          {groups.map((g) => {
            const rs = rows.filter((r) => r.group === g);
            const n = sum(rs);
            return (
              <tbody key={g}>
                <tr className="deck-group">
                  <th colSpan={3}>
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
