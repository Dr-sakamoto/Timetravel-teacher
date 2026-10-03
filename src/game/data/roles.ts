import { ATTR_ICON, type Attr, type RoleId } from '../types';

/** 係：係に就いた子は、その係のアイコンが2倍に数えられる */
export interface RoleDef {
  id: RoleId;
  name: string;
  icon: string;
  attr: Attr;
}

export const ROLES: Record<RoleId, RoleDef> = {
  study: { id: 'study', name: '学習係', icon: '✏️', attr: 'study' },
  pe: { id: 'pe', name: '体育委員', icon: '🏅', attr: 'sports' },
  culture: { id: 'culture', name: '文化委員', icon: '🖌️', attr: 'art' },
  leader: { id: 'leader', name: '学級委員長', icon: '🎖️', attr: 'charm' },
  discipline: { id: 'discipline', name: '風紀委員', icon: '🛡️', attr: 'fight' },
};

/** 全クラス共通の係の種類 */
export const ROLE_ORDER: RoleId[] = ['study', 'pe', 'culture', 'leader', 'discipline'];

/** 係の席の最大数（6人） */
export const MAX_ROLE_SEATS = 6;
/** 1つの係に就ける人数 */
export const MAX_PER_ROLE = 2;
/** 同時に置ける係の種類 */
export const MAX_ROLE_KINDS = 3;

export function roleDesc(id: RoleId): string {
  return `${ATTR_ICON[ROLES[id].attr]}×2`;
}
