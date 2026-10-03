import { ATTR_ICON, type EventResult } from '../game/types';
import { EventArt, hasEventArt } from './art/events';

/** 卓の中央でめくられたイベントカード */
export function EventCardView({ result }: { result: EventResult }) {
  const attr = result.attr && result.attr !== 'all' ? ATTR_ICON[result.attr] : result.attr === 'all' ? '🌈' : null;
  const kind = { normal: '通常（めくった人）', contest: '共通イベント（全員）', era: '時代イベント（全員）', fixed: '学校行事（全員）', personal: 'イベント' }[result.tone];
  return (
    <div className={`ecard tone-${result.tone} deal-in`}>
      <div className="ecard-inner">
        <div className="ecard-kind">
          {kind}
          {attr && <span className="ecard-attr">{attr}</span>}
        </div>
        <div className="ecard-title">{result.title}</div>
        <div className={`ecard-art ${hasEventArt(result.art) ? 'has-art' : ''}`}>{hasEventArt(result.art) ? <EventArt id={result.art} /> : result.icon}</div>
        <div className="ecard-text">
          {result.rule && <div className="ecard-rule">{result.rule}</div>}
          {result.desc && <div className="ecard-desc">{result.desc}</div>}
        </div>
      </div>
    </div>
  );
}
