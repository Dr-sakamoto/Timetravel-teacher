import { useState } from 'react';
import { autoRoles, autoUnlock } from '../game/ai';
import { moveToRole } from '../game/calc';
import { MAX_PER_ROLE } from '../game/data/roles';
import type { Player, RoleId, RoleSeat } from '../game/types';
import { Playmat, type DropTo } from './Playmat';

interface Props {
  player: Player;
  year: number;
  slots: number;
  onConfirm: (roles: RoleSeat[], unlock: RoleId[]) => void;
}

/**
 * 係決め：プレイマットの「係の場」にカードを置くと、その子がその係になる。
 * カードはドラッグで動かすか、タップで持ち上げて置き場をタップ。係の場どうし・係の場と座席のカードは入れ替わる。
 * まだ解放していない係の場（🆕）をタップすると、今学期の新しい係として解放する
 */
export function RoleEditor({ player, year, slots, onConfirm }: Props) {
  const need = Math.max(0, slots - player.unlocked.length);
  const [unlock, setUnlock] = useState<RoleId[]>([]);
  const kinds = [...player.unlocked, ...unlock];
  const [roles, setRoles] = useState<RoleSeat[]>(() =>
    player.roles.filter((r) => player.students.some((s) => s.uid === r.uid) && player.unlocked.includes(r.role)),
  );
  const [held, setHeld] = useState<string | null>(null);
  const [warn, setWarn] = useState('');
  const roleOfUid = (uid: string) => roles.find((r) => r.uid === uid)?.role;

  const canUnlock = (r: RoleId) => need > 0 && !kinds.includes(r);

  const place = (uid: string | null, to: DropTo) => {
    setWarn('');
    setHeld(null);
    if (to.kind === 'role') {
      let next = roles;
      if (!kinds.includes(to.role)) {
        if (!canUnlock(to.role)) return;
        // 解放枠がいっぱいなら、一番前に選んだものと入れ替える
        const dropped = unlock.length >= need ? unlock[0] : null;
        setUnlock([...unlock.filter((x) => x !== dropped), to.role]);
        if (dropped) next = next.filter((x) => x.role !== dropped);
      }
      if (uid) next = moveToRole(next, uid, to.role);
      else if (kinds.includes(to.role)) setWarn('先にカードをタップするか、ドラッグして置いてね');
      setRoles(next);
      return;
    }
    if (!uid) return;
    if (to.kind === 'seats') return setRoles(roles.filter((r) => r.uid !== uid));
    // カードの上に置いた：係の子どうし・係の子と座席の子を入れ替える
    if (to.uid === uid) return;
    const theirs = roleOfUid(to.uid);
    const mine = roleOfUid(uid);
    if (theirs) setRoles(moveToRole(roles, uid, theirs));
    else if (mine) setRoles(moveToRole(roles, to.uid, mine));
  };

  const tap = (uid: string) => {
    setWarn('');
    if (held === uid) return setHeld(null);
    // 座席の子どうしは入れ替える意味がないので、持ち替えるだけ
    if (!held || (!roleOfUid(held) && !roleOfUid(uid))) return setHeld(uid);
    place(held, { kind: 'card', uid });
  };

  const ready = unlock.length === need;

  return (
    <div className="role-editor">
      <div className="role-bar">
        <span>
          {need > 0 && !ready ? (
            <b>🆕の係の場をタップして、新しく解放する係を{need}つ選んでね</b>
          ) : (
            <>カードを係の場へドラッグ（タップで持ち上げて置き場をタップでもOK）。1つの係に{MAX_PER_ROLE}人</>
          )}
        </span>
        {warn && <div className="role-warn">{warn}</div>}
        <button
          className="btn small ghost"
          onClick={() => {
            const u = ready ? unlock : autoUnlock(player, slots);
            setUnlock(u);
            setRoles(autoRoles(player, [...player.unlocked, ...u]));
            setHeld(null);
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
        arrange={{ held, fresh: unlock, canUnlock, onTap: tap, onPlace: place }}
      />
    </div>
  );
}
