import { attrValues, roleOf } from '../game/calc';
import { ERAS } from '../game/data/eras';
import { ROLES } from '../game/data/roles';
import { ATTR_ICON, ATTR_LABEL, type Ability, type Player, type Student } from '../game/types';

export function abilityText(a?: Ability): string | null {
  if (!a) return null;
  switch (a.kind) {
    case 'aura':
      return `クラスの${ATTR_ICON[a.attr]}持ち全員+${a.amount}`;
    case 'boost':
      return `${ATTR_ICON[a.attr]}のイベントで自分+${a.amount}`;
    case 'roleBonus':
      return `${ROLES[a.role].name}になると倍率×${a.mult}`;
    case 'income':
      return `毎ターン+${a.amount}pt`;
    case 'guard':
      return `クラスの失点-${Math.round(a.ratio * 100)}%`;
  }
}

interface Props {
  student: Student;
  owner?: Player;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
  dim?: boolean;
}

export function StudentCard({ student, owner, selected, onClick, compact, dim }: Props) {
  const vals = owner ? attrValues(owner, student) : null;
  const role = owner ? roleOf(owner, student.uid) : null;
  const era = ERAS.find((e) => e.id === student.era)!;
  const ab = abilityText(student.ability);
  return (
    <div
      className={`scard r-${student.rarity} ${selected ? 'selected' : ''} ${onClick ? 'clickable' : ''} ${compact ? 'compact' : ''} ${dim ? 'dim' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
      <div className="scard-head">
        <span className="scard-icon">{student.icon}</span>
        <div className="scard-names">
          <div className="scard-title">
            <span className={`rarity r-${student.rarity}`}>{student.rarity}</span> {student.title}
          </div>
          <div className="scard-name">{student.name}</div>
        </div>
        <span className="power" title="数値（強さ）">
          {student.power}
        </span>
      </div>
      <div className="attrs">
        {student.attrs.map((a) => {
          const v = vals?.[a];
          const boosted = v !== undefined && v !== student.power;
          return (
            <span key={a} className={`attr a-${a} ${boosted ? 'boosted' : ''}`} title={`${ATTR_LABEL[a]}${v !== undefined ? `：${v}` : ''}`}>
              {ATTR_ICON[a]}
              {boosted && <small>{v}</small>}
            </span>
          );
        })}
      </div>
      <div className="scard-era" style={{ color: era.color }}>
        {era.icon} {era.name}
        {student.tags
          .filter((t) => t !== '現代')
          .map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
      </div>
      {role && (
        <div className="role-badge">
          {ROLES[role].icon} {ROLES[role].name}
        </div>
      )}
      {ab && <div className="ability">★ {ab}</div>}
      {!compact && <div className="flavor">{student.flavor}</div>}
    </div>
  );
}
