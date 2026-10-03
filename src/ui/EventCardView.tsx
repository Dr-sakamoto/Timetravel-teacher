import { ATTR_ICON, type EventResult } from '../game/types';

/** 卓の中央でめくられたイベントカード */
export function EventCardView({ result }: { result: EventResult }) {
  const attr = result.attr && result.attr !== 'all' ? ATTR_ICON[result.attr] : result.attr === 'all' ? '🌈' : null;
  const kind = { normal: '通常', contest: 'イベント', era: '時代イベント', fixed: '学校行事（全員）', personal: 'イベント' }[result.tone];
  return (
    <div className={`ecard tone-${result.tone} deal-in`}>
      <div className="ecard-inner">
        <div className="ecard-kind">
          {kind}
          {attr && <span className="ecard-attr">{attr}</span>}
        </div>
        <div className="ecard-title">{result.title}</div>
        <div className="ecard-art">{result.icon}</div>
        <div className="ecard-text">
          {result.rule && <div className="ecard-rule">{result.rule}</div>}
          {result.desc && <div className="ecard-desc">{result.desc}</div>}
        </div>
      </div>
    </div>
  );
}
