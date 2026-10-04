import { ATTR_ICON, type EventResult } from '../game/types';
import { EventArt, hasEventArt } from './art/events';

/** 卓の中央に出たイベントカード（取ったカード・ゲリラ・学校行事）。文字は名前と効果だけ */
export function EventCardView({ result }: { result: EventResult }) {
  // 角のアイコン：競うアイコンが1種類のときだけ（全アイコンなら式に「アイコン」と書く）
  const attr = result.attr && result.attr !== 'all' ? ATTR_ICON[result.attr] : null;
  // 誰に効くか：取った人だけ（👤）か、全クラス（👥）か
  const scope = result.tone === 'normal' || result.tone === 'personal' ? '👤' : '👥';
  // 物語の文は、ほかに何も見せるものがないときだけ
  const descOnly = !result.glyph && !result.rows.length && !result.students?.length;
  return (
    <div className={`ecard tone-${result.tone} deal-in`} title={result.rule ?? result.desc}>
      <div className="ecard-inner">
        <div className="ecard-kind">
          <span title={scope === '👤' ? '取った人だけ' : '全クラス'}>{scope}</span>
          {attr && <span className="ecard-attr">{attr}</span>}
        </div>
        <div className="ecard-title">{result.title}</div>
        <div className={`ecard-art ${hasEventArt(result.art) ? 'has-art' : ''}`}>{hasEventArt(result.art) ? <EventArt id={result.art} /> : result.icon}</div>
        {result.glyph ? (
          <div className="ecard-glyph">{result.glyph}</div>
        ) : (
          descOnly && (
            <div className="ecard-text">
              <div className="ecard-desc">{result.desc}</div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
