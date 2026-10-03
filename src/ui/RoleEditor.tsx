import { useState } from 'react';
import { autoRoles } from '../game/ai';
import { MAX_PER_ROLE, ROLES, ROLE_ORDER, roleDesc } from '../game/data/roles';
import type { Player, RoleId, RoleSeat } from '../game/types';
import { Playmat } from './Playmat';

interface Props {
  player: Player;
  year: number;
  slots: number;
  onConfirm: (roles: RoleSeat[]) => void;
}

/** 係決め：係の種類を選んで、座席の生徒をタップ（もう一度タップで外す） */
export function RoleEditor({ player, year, slots, onConfirm }: Props) {
  const k = slots;
  const [roles, setRoles] = useState<RoleSeat[]>(() =>
    player.roles.filter((r) => player.students.some((s) => s.uid === r.uid)).slice(0, k),
  );
  const [active, setActive] = useState<RoleId>(() => roles[0]?.role ?? ROLE_ORDER[0]);
  const [warn, setWarn] = useState('');
  const kinds = new Set(roles.map((r) => r.role));
  const role = ROLES[active];

  const assign = (uid: string) => {
    const cur = roles.find((r) => r.uid === uid);
    if (cur?.role === active) {
      setRoles(roles.filter((r) => r.uid !== uid));
      setWarn('');
      return;
    }
    const rest = roles.filter((r) => r.uid !== uid);
    if (rest.length >= k) return setWarn(`係は今学期${k}種まで`);
    if (rest.filter((r) => r.role === active).length >= MAX_PER_ROLE) return setWarn(`${role.name}は${MAX_PER_ROLE}人まで`);
    const next = cur ? roles.map((r) => (r.uid === uid ? { role: active, uid } : r)) : [...roles, { role: active, uid }];
    setRoles(next);
    setWarn('');
  };

  return (
    <div className="role-editor">
      <div className="role-bar">
        <span>
          係 {roles.length}/{k}種（1つの係に{MAX_PER_ROLE}人）
        </span>
        <div className="role-kinds">
          {ROLE_ORDER.map((r) => (
            <button key={r} className={`chip ${active === r ? 'on' : ''} ${kinds.has(r) ? 'used' : ''}`} onClick={() => setActive(r)} title={`${ROLES[r].name} ${roleDesc(r)}`}>
              {ROLES[r].icon}
              <span className="role-kind-name">{ROLES[r].name}</span> {roleDesc(r)}
            </button>
          ))}
        </div>
        {warn && <div className="role-warn">{warn}</div>}
        <button className="btn small ghost" onClick={() => setRoles(autoRoles(player, k))}>
          🤖 おまかせ
        </button>
        <button className="btn primary" onClick={() => onConfirm(roles)}>
          決定
        </button>
      </div>
      <Playmat
        player={player}
        year={year}
        slots={k}
        variant="near"
        acting
        roles={roles}
        onSlotClick={(i) => setRoles(roles.filter((_, j) => j !== i))}
        onSeatClick={assign}
        dimUid={(uid) => !player.students.find((s) => s.uid === uid)?.attrs.includes(role.attr)}
      />
    </div>
  );
}
