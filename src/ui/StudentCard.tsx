import { effStats, roleOf } from '../game/calc';
import { ERAS } from '../game/data/eras';
import { ROLES } from '../game/data/roles';
import { CATEGORY_LABEL, STAT_KEYS, STAT_LABEL, type Ability, type Player, type Student } from '../game/types';

export function abilityText(a?: Ability): string | null {
  if (!a) return null;
  switch (a.kind) {
    case 'aura':
      return `クラス全員の${STAT_LABEL[a.stat]}+${a.amount}`;
    case 'boost':
      return `${CATEGORY_LABEL[a.category]}イベントで+${a.amount}`;
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
  const eff = owner ? effStats(owner, student) : student.base;
  const role = owner ? roleOf(owner, student.uid) : null;
  const era = ERAS.find((e) => e.id === student.era)!;
  const ab = abilityText(student.ability);
  const max = 25;
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
          <div className="scard-title">{student.title}</div>
          <div className="scard-name">{student.name}</div>
        </div>
        <span className={`rarity r-${student.rarity}`}>{student.rarity}</span>
      </div>
      <div className="scard-era" style={{ color: era.color }}>
        {era.icon} {era.name}
        {student.tags.filter((t) => t !== '現代').map((t) => (
          <span key={t} className="tag">{t}</span>
        ))}
      </div>
      {role && (
        <div className="role-badge">
          {ROLES[role].icon} {ROLES[role].name}
        </div>
      )}
      <div className="stats">
        {STAT_KEYS.map((k) => {
          const v = eff[k];
          const boosted = Math.round(v * 10) !== Math.round(student.base[k] * 10);
          return (
            <div className="stat" key={k}>
              <span className="stat-label">{STAT_LABEL[k]}</span>
              <span className="stat-bar">
                <span className={`stat-fill s-${k}`} style={{ width: `${Math.min(100, (v / max) * 100)}%` }} />
              </span>
              <span className={`stat-num ${boosted ? 'boosted' : ''}`}>{Math.round(v * 10) / 10}</span>
            </div>
          );
        })}
      </div>
      {ab && <div className="ability">★ {ab}</div>}
      {!compact && <div className="flavor">{student.flavor}</div>}
    </div>
  );
}
