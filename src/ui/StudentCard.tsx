import type { CSSProperties } from 'react';
import { attrValues, roleOf } from '../game/calc';
import { ERAS } from '../game/data/eras';
import { ROLES } from '../game/data/roles';
import { ATTR_ICON, ATTR_LABEL, type Ability, type Player, type Student, type Tag } from '../game/types';

/** 特殊能力の短い表記 */
export function abilityText(a?: Ability): string | null {
  if (!a) return null;
  switch (a.kind) {
    case 'aura':
      return `全員${ATTR_ICON[a.attr]}+${a.amount}`;
    case 'boost':
      return `${ATTR_ICON[a.attr]}+${a.amount}`;
    case 'roleBonus':
      return `${ROLES[a.role].icon}で×${a.mult}`;
    case 'income':
      return `毎ターン+${a.amount}pt`;
    case 'guard':
      return `失点-${Math.round(a.ratio * 100)}%`;
  }
}

/** イベントの特殊効果に関わるタグのアイコン */
export const TAG_ICON: Partial<Record<Tag, string>> = {
  恐竜: '🦖',
  王族: '💎',
  武将: '⚔️',
  学者: '🎓',
  芸術家: '🖼️',
  忍者: '🥷',
  未来: '🚀',
  動物: '🐾',
};

interface Props {
  student: Student;
  owner?: Player;
  selected?: boolean;
  onClick?: () => void;
  dim?: boolean;
}

/** トレカ風の生徒カード */
export function StudentCard({ student, owner, selected, onClick, dim }: Props) {
  const vals = owner ? attrValues(owner, student) : null;
  const role = owner ? roleOf(owner, student.uid) : null;
  const era = ERAS.find((e) => e.id === student.era)!;
  const ab = abilityText(student.ability);
  const tags = student.tags.filter((t) => TAG_ICON[t]);
  return (
    <div
      className={`tcard r-${student.rarity} ${selected ? 'selected' : ''} ${onClick ? 'clickable' : ''} ${dim ? 'dim' : ''}`}
      style={{ '--era': era.color } as CSSProperties}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      title={`${student.name}（${student.title}・${era.name}・${student.rarity}）\n${student.flavor}${ab ? `\n★${ab}` : ''}`}
    >
      <div className="tcard-top">
        <span className="power">{student.power}</span>
        {tags.length > 0 && (
          <span className="tcard-tags">
            {tags.map((t) => (
              <span key={t}>{TAG_ICON[t]}</span>
            ))}
          </span>
        )}
        {ab && <span className="tcard-star">★</span>}
      </div>
      <div className="tcard-art">{student.icon}</div>
      <div className="tcard-name">{student.name}</div>
      <div className="tcard-attrs">
        {student.attrs.map((a) => {
          const v = vals?.[a];
          const boosted = v !== undefined && v !== student.power;
          return (
            <span key={a} className={`attr a-${a} ${boosted ? 'boosted' : ''}`} title={ATTR_LABEL[a]}>
              {ATTR_ICON[a]}
              {boosted && <small>{v}</small>}
            </span>
          );
        })}
      </div>
      {role && <div className="tcard-role">{ROLES[role].icon}{ROLES[role].name}</div>}
    </div>
  );
}
