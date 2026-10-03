import { useState } from 'react';
import { autoRoles, autoUnlock } from '../game/ai';
import { MAX_PER_ROLE, ROLES, ROLE_ORDER, roleDesc } from '../game/data/roles';
import type { Player, RoleId, RoleSeat } from '../game/types';
import { Playmat } from './Playmat';

interface Props {
  player: Player;
  year: number;
  slots: number;
  onConfirm: (roles: RoleSeat[], unlock: RoleId[]) => void;
}

/** 係決め：新しく解放する係を選び（学期の頭に1種）、係を選んで座席の生徒をタップ（もう一度タップで外す） */
export function RoleEditor({ player, year, slots, onConfirm }: Props) {
  const need = Math.max(0, slots - player.unlocked.length);
  const [unlock, setUnlock] = useState<RoleId[]>([]);
  const kinds = [...player.unlocked, ...unlock];
  const [roles, setRoles] = useState<RoleSeat[]>(() =>
    player.roles.filter((r) => player.students.some((s) => s.uid === r.uid) && player.unlocked.includes(r.role)),
  );
  const [active, setActive] = useState<RoleId | null>(() => player.unlocked[0] ?? null);
  const [warn, setWarn] = useState('');
  const role = active && ROLES[active];

  const pickKind = (r: RoleId) => {
    setWarn('');
    if (kinds.includes(r)) return setActive(r);
    if (need === 0) return setWarn('今学期はもう新しい係を解放できない');
    // 解放枠がいっぱいなら、一番前に選んだものと入れ替える
    const dropped = unlock.length >= need ? unlock[0] : null;
    setUnlock([...unlock.filter((x) => x !== dropped), r]);
    if (dropped) setRoles(roles.filter((x) => x.role !== dropped));
    setActive(r);
  };

  const assign = (uid: string) => {
    if (!active || !role) return setWarn('先に係を選んでね');
    const cur = roles.find((r) => r.uid === uid);
    if (cur?.role === active) {
      setRoles(roles.filter((r) => r.uid !== uid));
      setWarn('');
      return;
    }
    // 1つの係に1人なので、前に就いていた子は外れる
    const rest = roles.filter((r) => r.uid !== uid && r.role !== active);
    setRoles([...rest, { role: active, uid }]);
    setWarn('');
  };

  const ready = unlock.length === need;

  return (
    <div className="role-editor">
      <div className="role-bar">
        <span>
          係 {kinds.length}種（1つの係に{MAX_PER_ROLE}人）
          {need > 0 && !ready && <b> — 🔒の係から新しく解放する係を{need}つ選んでね</b>}
        </span>
        <div className="role-kinds">
          {ROLE_ORDER.map((r) => {
            const isNew = unlock.includes(r);
            const locked = !kinds.includes(r);
            return (
              <button
                key={r}
                className={`chip ${active === r ? 'on' : ''} ${roles.some((x) => x.role === r) ? 'used' : ''} ${locked ? 'locked' : ''}`}
                disabled={locked && need === 0}
                onClick={() => pickKind(r)}
                title={`${ROLES[r].name} ${roleDesc(r)}${locked ? '（タップで解放）' : ''}`}
              >
                {locked ? '🔒' : isNew ? '🆕' : ''}
                {ROLES[r].icon}
                <span className="role-kind-name">{ROLES[r].name}</span> {roleDesc(r)}
              </button>
            );
          })}
        </div>
        {warn && <div className="role-warn">{warn}</div>}
        <button
          className="btn small ghost"
          onClick={() => {
            const u = ready ? unlock : autoUnlock(player, slots);
            setUnlock(u);
            setRoles(autoRoles(player, [...player.unlocked, ...u]));
          }}
        >
          🤖 おまかせ
        </button>
        <button className="btn primary" disabled={!ready} onClick={() => onConfirm(roles, unlock)}>
          決定
        </button>
      </div>
      <Playmat
        player={player}
        year={year}
        slots={slots}
        variant="near"
        acting
        roles={roles}
        unlocked={kinds}
        onSlotClick={(i) => setRoles(roles.filter((r) => r.role !== kinds[i]))}
        onSeatClick={assign}
        dimUid={(uid) => !role || !player.students.find((s) => s.uid === uid)?.attrs.includes(role.attr)}
      />
    </div>
  );
}
