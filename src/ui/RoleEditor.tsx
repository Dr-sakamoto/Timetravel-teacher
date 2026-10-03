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
  const [activeSlot, setActiveSlot] = useState(0);
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
  const fit = (st: Player['students'][number]) =>
    ROLES[roleKey].animal && (st.tags.includes('恐竜') || st.tags.includes('動物'))
      ? 99
      : focusAttrs.filter((a) => st.attrs.includes(a)).length;
  const sorted = [...player.students].sort((a, b) => fit(b) - fit(a) || b.power - a.power);

  return (
    <div className="role-editor">
      <div className="panel-head">
        <h2>
          {termLabel} 係決め — {player.name}
        </h2>
        <div className="role-actions">
          <button className="btn small ghost" onClick={() => setRoles(autoRoles(player))}>
            🤖 おまかせ
          </button>
          <button className="btn primary" onClick={() => onConfirm(roles)}>
            決定
          </button>
        </div>
      </div>
      <div className="slots">
        {card.roles.map((r, i) => {
          const st = player.students.find((s) => s.uid === roles[i]);
          const vals = st ? attrValues(draft, st) : null;
          return (
            <button key={i} className={`slot ${activeSlot === i ? 'active' : ''}`} onClick={() => setActiveSlot(i)} title={roleDesc(r)}>
              <span className="slot-role">
                {ROLES[r].icon} {ROLES[r].name}
              </span>
              <span className="slot-mult">{roleDesc(r)}</span>
              <span className="slot-who">{st ? `${st.icon} ${st.name}` : '—'}</span>
              {vals && (
                <span className="slot-eff">
                  {Object.entries(vals)
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
              {c.icon}
              <b>{Math.round(c.value * 10) / 10}</b>
              {diff !== 0 && <small className={diff > 0 ? 'up' : 'down'}>{diff > 0 ? `+${diff}` : diff}</small>}
            </div>
          );
        })}
      </div>
      <div className="card-grid">
        {sorted.map((s) => (
          <StudentCard
            key={s.uid}
            student={s}
            owner={draft}
            selected={roles[activeSlot] === s.uid}
            dim={roles.includes(s.uid) && roles[activeSlot] !== s.uid}
            onClick={() => assign(s.uid)}
          />
        ))}
      </div>
    </div>
  );
}
