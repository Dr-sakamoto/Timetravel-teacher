import { useMemo, useState } from 'react';
import { autoRoles, classSummary } from '../game/ai';
import { effStats } from '../game/calc';
import { CLASS_MAP } from '../game/data/classes';
import { ROLES, roleDesc } from '../game/data/roles';
import { STAT_LABEL, type Player, type StatKey } from '../game/types';
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
  const focusStats = Object.keys(ROLES[roleKey].mult) as StatKey[];
  const sorted = [...player.students].sort((a, b) => {
    const sa = focusStats.reduce((x, k) => x + a.base[k], 0);
    const sb = focusStats.reduce((x, k) => x + b.base[k], 0);
    return sb - sa;
  });

  return (
    <div className="role-editor">
      <h2>
        {termLabel}の係を決めよう — {player.name}
      </h2>
      <p className="hint">
        係スロットを選んでから生徒をタップ。係についた生徒は能力にバフがかかる。係は学期ごとにしか変えられないので、
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
                  {(Object.keys(ROLES[r].mult) as StatKey[])
                    .map((k) => `${STAT_LABEL[k]} ${Math.round(effStats(draft, st)[k] * 10) / 10}`)
                    .join(' / ')}
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
        {ROLES[roleKey].icon} {ROLES[roleKey].name}の候補（{focusStats.map((k) => STAT_LABEL[k]).join('・')}順）
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
