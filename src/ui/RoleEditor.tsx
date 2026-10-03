import { useState } from 'react';
import { autoRoles } from '../game/ai';
import { ROLES, ROLE_ORDER, roleDesc } from '../game/data/roles';
import type { Player } from '../game/types';
import { Playmat } from './Playmat';

interface Props {
  player: Player;
  year: number;
  slots: number;
  onConfirm: (roles: (string | null)[]) => void;
}

/** 係決め：手前の教室マットの係ボードを選び、座席の生徒をタップ */
export function RoleEditor({ player, year, slots, onConfirm }: Props) {
  const k = slots;
  const [roles, setRoles] = useState<(string | null)[]>(() =>
    ROLE_ORDER.map((_, i) => {
      const r = player.roles[i];
      return i < k && r && player.students.some((s) => s.uid === r) ? r : null;
    }),
  );
  const [active, setActive] = useState(0);
  const role = ROLES[ROLE_ORDER[active]];
  const assign = (uid: string) => {
    setRoles((prev) => {
      const next = prev.map((r) => (r === uid ? null : r));
      next[active] = prev[active] === uid ? null : uid;
      return next;
    });
    setActive((i) => (i + 1 < k ? i + 1 : i));
  };
  return (
    <div className="role-editor">
      <div className="role-bar">
        <span>
          {role.icon} <b>{role.name}</b>（{roleDesc(role.id)}）に就ける生徒をタップ
        </span>
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
        activeSlot={active}
        onSlotClick={setActive}
        onSeatClick={assign}
        selectedUid={roles[active]}
        dimUid={(uid) => !player.students.find((s) => s.uid === uid)?.attrs.includes(role.attr)}
      />
    </div>
  );
}
