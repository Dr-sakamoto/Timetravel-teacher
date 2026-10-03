import { useMemo, useState } from 'react';
import { autoRoles, classSummary } from '../game/ai';
import { attrValues } from '../game/calc';
import { CLASS_MAP } from '../game/data/classes';
import { ROLES, roleDesc } from '../game/data/roles';
import { ATTR_ICON, type Attr, type Player } from '../game/types';
import { StudentCard } from './StudentCard';

interface Props {
  player: Player;
  termLabel: string;
  onConfirm: (roles: (string | null)[]) => void;
}

export function RoleEditor({ player, termLabel, onConfirm }: Props) {
  const card = CLASS_MAP[player.classCardId!];
  const [roles, setRoles] = useState<(string | null)[]>(() =>
    player.roles.map((r) => (r && player.students.some((s) => s.uid === r) ? r : null)),
  );
  const [activeSlot, setActiveSlot] = useState<number>(0);
  const draft: Player = useMemo(() => ({ ...player, roles }), [player, roles]);
  const summary = useMemo(() => classSummary(draft), [draft]);
  const current = useMemo(() => classSummary(player), [player]);

  const assign = (uid: string) => {
    setRoles((prev) => {
      const next = prev.map((r) => (r === uid ? null : r));
      next[activeSlot] = prev[activeSlot] === uid ? null : uid;
      return next;
    });
    setActiveSlot((i) => Math.min(card.roles.length - 1, i + 1));
  };

  const roleKey = card.roles[activeSlot];
  const focusAttrs = Object.keys(ROLES[roleKey].mult) as Attr[];
  const fit = (st: Player['students'][number]) => {
    const n = focusAttrs.filter((a) => st.attrs.includes(a)).length;
    return ROLES[roleKey].animal && (st.tags.includes('恐竜') || st.tags.includes('動物')) ? 99 : n;
  };
  const sorted = [...player.students].sort((a, b) => fit(b) - fit(a) || b.power - a.power);

  return (
    <div className="role-editor">
      <h2>
        {termLabel}の係を決めよう — {player.name}
      </h2>
      <p className="hint">
        係スロットを選んでから生徒をタップ。係は生徒が「持っている属性」の数値を強化する（持っていない属性は増えない）。係は学期ごとにしか変えられないので、
        次の学期までのイベントを見越して編成しよう。
      </p>
      <div className="slots">
        {card.roles.map((r, i) => {
          const uid = roles[i];
          const st = player.students.find((s) => s.uid === uid);
          return (
            <button key={i} className={`slot ${activeSlot === i ? 'active' : ''}`} onClick={() => setActiveSlot(i)}>
              <span className="slot-role">
                {ROLES[r].icon} {ROLES[r].name}
              </span>
              <span className="slot-desc">{roleDesc(r)}</span>
              <span className="slot-who">{st ? `${st.icon} ${st.name}` : '— 未設定 —'}</span>
              {st && (
                <span className="slot-eff">
                  {Object.entries(attrValues(draft, st))
                    .map(([k, v]) => `${ATTR_ICON[k as Attr]}${v}`)
                    .join(' ')}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="summary-row">
        {summary.map((c, i) => {
          const diff = Math.round((c.value - current[i].value) * 10) / 10;
          return (
            <div key={c.label} className="summary" title={c.hint}>
              <span>
                {c.icon} {c.label}
              </span>
              <b>{Math.round(c.value * 10) / 10}</b>
              {diff !== 0 && <small className={diff > 0 ? 'up' : 'down'}>{diff > 0 ? `+${diff}` : diff}</small>}
            </div>
          );
        })}
      </div>
      <div className="role-actions">
        <button className="btn ghost" onClick={() => setRoles(autoRoles(player))}>
          🤖 おまかせ編成
        </button>
        <button className="btn ghost" onClick={() => setRoles(roles.map(() => null))}>
          全部外す
        </button>
        <button className="btn primary" onClick={() => onConfirm(roles)}>
          この編成で決定
        </button>
      </div>
      <h3>
        {ROLES[roleKey].icon} {ROLES[roleKey].name}の候補（{focusAttrs.map((k) => ATTR_ICON[k]).join('')}を持つ子が上）
      </h3>
      <div className="card-grid">
        {sorted.map((s) => (
          <StudentCard
            key={s.uid}
            student={s}
            owner={draft}
            compact
            selected={roles[activeSlot] === s.uid}
            dim={roles.includes(s.uid) && roles[activeSlot] !== s.uid}
            onClick={() => assign(s.uid)}
          />
        ))}
      </div>
    </div>
  );
}
