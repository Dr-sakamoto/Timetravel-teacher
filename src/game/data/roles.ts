import { ATTR_ICON, type Attr, type RoleId } from '../types';

/** 係：担当した生徒が「持っている属性」の数値を強化する（属性そのものは増えない） */
export interface RoleDef {
  id: RoleId;
  name: string;
  icon: string;
  mult: Partial<Record<Attr, number>>;
  /** 担当者がいればクラスの失点をこの割合だけ軽減 */
  guard?: number;
  /** 恐竜・動物が担当すると全属性×ANIMAL_MULT */
  animal?: boolean;
}

export const ANIMAL_MULT = 1.5;

export const ROLES: Record<RoleId, RoleDef> = {
  leader: { id: 'leader', name: '学級委員長', icon: '🎖️', mult: { charm: 1.5, study: 1.2 } },
  vice: { id: 'vice', name: '副委員長', icon: '📌', mult: { charm: 1.3, study: 1.3 } },
  pe: { id: 'pe', name: '体育委員', icon: '🏅', mult: { sports: 1.5 } },
  cheer: { id: 'cheer', name: '応援団長', icon: '📣', mult: { charm: 1.3, sports: 1.3, fight: 1.2 } },
  study: { id: 'study', name: '学習係', icon: '✏️', mult: { study: 1.5 } },
  library: { id: 'library', name: '図書委員', icon: '📖', mult: { study: 1.3, art: 1.3 } },
  discipline: { id: 'discipline', name: '風紀委員', icon: '🛡️', mult: { fight: 1.5, charm: 1.2 } },
  culture: { id: 'culture', name: '文化委員', icon: '🖌️', mult: { art: 1.5 } },
  broadcast: { id: 'broadcast', name: '放送委員', icon: '📻', mult: { art: 1.3, charm: 1.3 } },
  health: { id: 'health', name: '保健委員', icon: '🩹', mult: { charm: 1.2 }, guard: 0.25 },
  animal: { id: 'animal', name: '飼育係', icon: '🐾', mult: { charm: 1.2 }, animal: true },
};

export function roleDesc(id: RoleId): string {
  const r = ROLES[id];
  const parts = (Object.keys(r.mult) as Attr[]).map((k) => `${ATTR_ICON[k]}×${r.mult[k]}`);
  if (r.animal) return `恐竜・動物なら全属性×${ANIMAL_MULT}／それ以外は${parts.join(' ')}`;
  if (r.guard) parts.push(`失点-${Math.round(r.guard * 100)}%`);
  return parts.join(' ');
}
