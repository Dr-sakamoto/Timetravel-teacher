import type { CSSProperties, PointerEvent } from 'react';
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
  /** つかんで動かせるカード（係決め） */
  onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
  /** カードを重ねて置ける場所としての名前（data-drop） */
  drop?: string;
}

const RARITY_MARK = { N: '●', R: '◆', SR: '★', SSR: '✦' } as const;

/** TCG風の生徒カード：中央にイラスト、下段に属性アイコン（重なるほど強い） */
export function TcgCard({ student, owner, size = 'full', selected, lit, dim, onClick, onPointerDown, drop }: Props) {
  // 古いセーブデータの生徒は art を持たないので、歴史カードはIDから引き、現代の生徒は絵文字で出す
  const art = student.art ?? student.cardId;
  const era = ERAS.find((e) => e.id === student.era)!;
  const role = owner ? roleOf(owner, student.uid) : null;
  return (
    <div
      data-uid={student.uid}
      data-drop={drop}
      className={`tcg ${size} r-${student.rarity} ${selected ? 'selected' : ''} ${lit ? 'lit' : ''} ${dim ? 'dim' : ''} ${onClick ? 'clickable' : ''} ${onPointerDown ? 'grabbable' : ''}`}
      style={{ '--era': era.color } as CSSProperties}
      onClick={
        onClick &&
        ((e) => {
          e.stopPropagation();
          onClick();
        })
      }
      onPointerDown={onPointerDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      title={`${student.name}（${era.name}${student.title ? `・${student.title}` : ''}）\n${student.attrs.map((a) => ATTR_LABEL[a]).join('・')}${student.goods ? `\n装備：${student.goods.name}` : ''}${student.plague ? '\nペスト（🏃を数えない）' : ''}${student.gunshi ? `\n軍師（${ATTR_ICON[student.gunshi]}×2）` : ''}\n${student.flavor}`}
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
            {era.icon} {student.title || era.name}
          </div>
        )}
        <div className={`tcg-attrs n${student.attrs.length}`}>
          {student.attrs.map((a, i) => (
            <span key={i} className={`tcg-attr a-${a} ${owner && hasRoleBonus(owner, student, a) ? 'bonus' : ''} ${student.plague && a === 'sports' ? 'sick' : ''}`}>
              {ATTR_ICON[a]}
            </span>
          ))}
        </div>
        {size === 'full' && <div className="tcg-foot">{RARITY_MARK[student.rarity]} {student.rarity}</div>}
      </div>
      {student.goods && (
        <div className="tcg-goods" title={`${student.goods.name}（${ATTR_ICON[student.goods.attr]}＋1）`}>
          {student.goods.icon}
        </div>
      )}
      {student.plague && (
        <div className="tcg-plague" title="ペストにかかっている（🏃を数えない。学期の区切りで治る）">
          🐀
        </div>
      )}
      {student.gunshi && (
        <div className="tcg-plague tcg-gunshi" title={`三顧の礼の軍師（${ATTR_ICON[student.gunshi]}×2。学期の区切りまで）`}>
          🪶
        </div>
      )}
      {role && <div className="tcg-role">{ROLES[role].icon}{size === 'full' && ROLES[role].name}</div>}
    </div>
  );
}
