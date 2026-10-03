import type { CSSProperties } from 'react';
import { hasRoleBonus, roleOf } from '../game/calc';
import { ERAS } from '../game/data/eras';
import { ROLES } from '../game/data/roles';
import { Portrait, hasPortrait } from './art/Portrait';
import { ATTR_ICON, ATTR_LABEL, type Player, type Student } from '../game/types';

interface Props {
  student: Student;
  owner?: Player;
  size?: 'full' | 'mini';
  selected?: boolean;
  /** 今のイベントに関わった（光らせる） */
  lit?: boolean;
  dim?: boolean;
  onClick?: () => void;
}

const RARITY_MARK = { N: '●', R: '◆', SR: '★', SSR: '✦' } as const;

/** TCG風の生徒カード：中央にイラスト、下段に属性アイコン（重なるほど強い） */
export function TcgCard({ student, owner, size = 'full', selected, lit, dim, onClick }: Props) {
  // 古いセーブデータの生徒は art を持たないので、歴史カードはIDから引き、現代の生徒は絵文字で出す
  const art = student.art ?? student.cardId;
  const era = ERAS.find((e) => e.id === student.era)!;
  const role = owner ? roleOf(owner, student.uid) : null;
  return (
    <div
      className={`tcg ${size} r-${student.rarity} ${selected ? 'selected' : ''} ${lit ? 'lit' : ''} ${dim ? 'dim' : ''} ${onClick ? 'clickable' : ''}`}
      style={{ '--era': era.color } as CSSProperties}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      title={`${student.name}（${era.name}・${student.title}）\n${student.attrs.map((a) => ATTR_LABEL[a]).join('・')}\n${student.flavor}`}
    >
      <div className="tcg-inner">
        <div className="tcg-head">
          <span className="tcg-name">{student.name}</span>
        </div>
        <div className="tcg-art">
          {hasPortrait(art) ? <Portrait art={art} /> : <span>{student.icon}</span>}
        </div>
        {size === 'full' && (
          <div className="tcg-type">
            {era.icon} {student.title}
          </div>
        )}
        <div className={`tcg-attrs n${student.attrs.length}`}>
          {student.attrs.map((a, i) => (
            <span key={i} className={`tcg-attr a-${a} ${owner && hasRoleBonus(owner, student, a) ? 'bonus' : ''}`}>
              {ATTR_ICON[a]}
            </span>
          ))}
        </div>
        {size === 'full' && <div className="tcg-foot">{RARITY_MARK[student.rarity]} {student.rarity}</div>}
      </div>
      {role && <div className="tcg-role">{ROLES[role].icon}{size === 'full' && ROLES[role].name}</div>}
    </div>
  );
}
