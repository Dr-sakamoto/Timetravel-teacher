import { useMemo, useState } from 'react';
import { autoRoles, classSummary } from '../game/ai';
import { roleSlots } from '../game/calc';
import { CLASS_MAP } from '../game/data/classes';
import { ROLES, roleDesc } from '../game/data/roles';
import type { Player } from '../game/types';
import { Classroom } from './Classroom';

interface Props {
  player: Player;
  year: number;
  termLabel: string;
  onConfirm: (roles: (string | null)[]) => void;
}

/** 係決め：黒板の係を選んでから、座席の生徒をタップ */
export function RoleEditor({ player, year, termLabel, onConfirm }: Props) {
  const card = CLASS_MAP[player.classCardId!];
  const k = roleSlots(player);
  const [roles, setRoles] = useState<(string | null)[]>(() =>
    card.roles.map((_, i) => {
      const r = player.roles[i];
      return i < k && r && player.students.some((s) => s.uid === r) ? r : null;
    }),
  );
  const [activeSlot, setActiveSlot] = useState(0);
  const draft: Player = useMemo(() => ({ ...player, roles }), [player, roles]);
  const summary = useMemo(() => classSummary(draft), [draft]);

  const assign = (uid: string) => {
    setRoles((prev) => {
      const next = prev.map((r) => (r === uid ? null : r));
      next[activeSlot] = prev[activeSlot] === uid ? null : uid;
      return next;
    });
    setActiveSlot((i) => (i + 1 < k ? i + 1 : i));
  };

  const role = card.roles[activeSlot];
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
      <div className="role-now">
        {ROLES[role].icon} <b>{ROLES[role].name}</b> <small>{roleDesc(role)}</small>
        <span className="summary-row inline">
          {summary.map((c) => (
            <span key={c.label} className="summary" title={c.hint}>
              {c.icon}
              <b>{Math.round(c.value * 10) / 10}</b>
            </span>
          ))}
        </span>
      </div>
      <Classroom
        player={draft}
        year={year}
        activeSlot={activeSlot}
        onSlotClick={setActiveSlot}
        onSeatClick={assign}
        selectedUid={roles[activeSlot]}
        dimUid={(uid) => roles.includes(uid) && roles[activeSlot] !== uid}
      />
    </div>
  );
}
