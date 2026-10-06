import type { Creature } from './creatures';
import { HAIR, SKIN, type Acc, type Beard, type Crest, type Expr, type HairBack, type HairFront, type Hat, type Outfit, type Prop } from './parts';

/** 人の形の生徒の組み立て方 */
export interface HumanSpec {
  skin?: string;
  hair?: HairFront;
  back?: HairBack;
  hairColor?: string;
  outfit: Outfit;
  /** 服のメインカラー */
  c1?: string;
  /** 服の差し色 */
  c2?: string;
  hat?: Hat;
  hatColor?: string;
  crest?: Crest;
  expr?: Expr;
  beard?: Beard;
  beardColor?: string;
  acc?: Acc[];
  prop?: Prop;
  /** アイライン（エジプトの化粧） */
  liner?: boolean;
}

export type ArtSpec = HumanSpec | { creature: Creature } | { photo: string };

const { black, brown, dark, blond, red, grey, white, pink, navy } = HAIR;

/** キーは歴史カードのID、または現代の生徒のアーキタイプID */
export const ART: Record<string, ArtSpec> = {
  // ---- 白亜紀 ----
  trex: { creature: 'trex' },
  triceratops: { creature: 'triceratops' },
  brachio: { creature: 'brachio' },
  ptera: { creature: 'ptera' },
  raptor: { creature: 'raptor' },

  // ---- 古代エジプト ----
  cleopatra: { skin: SKIN.tan, back: 'egypt', hair: 'patsun', hairColor: black, outfit: 'egypt', c1: '#3f7fd0', hat: 'diadem', acc: ['earring'], expr: 'calm', liner: true },
  tut: { skin: SKIN.tan, outfit: 'egypt', c1: '#3f7fd0', hat: 'nemes', hatColor: '#2f5fb3', expr: 'smile', liner: true },
  imhotep: { skin: SKIN.tan, outfit: 'egypt', c1: '#35a37a', expr: 'calm', prop: 'setsquare', acc: ['old'] },
  nefertiti: { skin: SKIN.tan, outfit: 'egypt', c1: '#d14b3c', hat: 'nefercrown', hatColor: '#3566b8', acc: ['earring'], expr: 'calm', liner: true },
  mason: { skin: SKIN.brown, outfit: 'bare', c1: '#f6f1e4', hat: 'headcloth', hatColor: '#f6f1e4', expr: 'grin', prop: 'brick', acc: ['sweat'] },

  // ---- ギリシャ・ローマ ----
  alexander: { skin: SKIN.fair, hair: 'curly', hairColor: blond, outfit: 'cuirass', c1: '#d9a441', c2: '#c0392b', expr: 'cool', prop: 'sword' },
  caesar: { skin: SKIN.fair, hair: 'short', hairColor: brown, outfit: 'toga', c1: '#8e3fa5', hat: 'laurel', expr: 'cool' },
  socrates: { skin: SKIN.fair, hair: 'sides', hairColor: grey, outfit: 'toga', c1: '#3f7fd0', beard: 'full', beardColor: grey, expr: 'calm', prop: 'scroll' },
  archimedes: { skin: SKIN.fair, hair: 'curly', hairColor: grey, outfit: 'bare', c1: '#fbfbf7', beard: 'full', beardColor: grey, expr: 'surprised', prop: 'bubbles' },
  leonidas: { skin: SKIN.tan, outfit: 'cuirass', c1: '#d9a441', c2: '#c0392b', hat: 'spartan', beard: 'full', beardColor: black, expr: 'angry', prop: 'shield' },
  spartacus: { skin: SKIN.tan, hair: 'messy', hairColor: dark, outfit: 'bare', c1: '#8a5a32', expr: 'angry', acc: ['scar'], prop: 'sword' },

  // ---- 古代中国 ----
  zhuge: { skin: SKIN.fair, outfit: 'robe', c1: '#f4f2ea', c2: '#3a5a8c', hat: 'guanjin', hatColor: '#3a5a8c', beard: 'thin', beardColor: black, expr: 'calm', prop: 'featherfan' },
  lubu: { skin: SKIN.fair, hair: 'short', hairColor: black, outfit: 'yoroi', c1: '#c0392b', c2: '#f2c94c', hat: 'pheasant', expr: 'angry', prop: 'halberd' },
  guanyu: { skin: SKIN.red, outfit: 'robe', c1: '#2f8a4c', c2: '#f2c94c', hat: 'softcap', hatColor: '#2f8a4c', beard: 'long', beardColor: black, expr: 'calm', prop: 'guandao' },
  confucius: { skin: SKIN.fair, hair: 'bun', hairColor: grey, outfit: 'robe', c1: '#8a6a4a', c2: '#f4f2ea', beard: 'long', beardColor: white, expr: 'calm', acc: ['old'], prop: 'book' },
  zhangfei: { skin: SKIN.tan, hair: 'messy', hairColor: black, outfit: 'yoroi', c1: '#3a3a44', c2: '#c0392b', beard: 'whiskers', beardColor: black, expr: 'shout', prop: 'spear' },

  // ---- 平安 ----
  seimei: { skin: SKIN.pale, outfit: 'robe', c1: '#fbfbf7', c2: '#7b5ea7', hat: 'eboshi', expr: 'calm', prop: 'ofuda' },
  murasaki: { skin: SKIN.pale, back: 'hime', hair: 'patsun', hairColor: black, outfit: 'juuni', c1: '#7b5ea7', c2: '#c9a7e8', expr: 'calm', prop: 'scroll' },
  yoshitsune: { skin: SKIN.pale, outfit: 'yoroi', c1: '#c0392b', c2: '#f2c94c', hat: 'kabuto', hatColor: '#c0392b', crest: 'horns', expr: 'smile', prop: 'katana' },
  benkei: { skin: SKIN.tan, outfit: 'yoroi', c1: '#2b2b2b', c2: '#f6f1e4', hat: 'monkhood', hatColor: '#f6f1e4', beard: 'stubble', beardColor: dark, expr: 'angry', prop: 'naginata' },
  komachi: { skin: SKIN.pale, back: 'hime', hair: 'patsun', hairColor: black, outfit: 'juuni', c1: '#f48fb1', c2: '#d14b6c', expr: 'smile', prop: 'sensu' },

  // ---- 中世・ルネサンス ----
  davinci: { skin: SKIN.fair, back: 'shoulder', hair: 'mid', hairColor: white, outfit: 'tunic', c1: '#a0442f', c2: '#5a3a2a', hat: 'beret', hatColor: '#3a2a2a', beard: 'long', beardColor: white, expr: 'calm', acc: ['old'], prop: 'palette' },
  joan: { skin: SKIN.fair, back: 'bob', hair: 'short', hairColor: brown, outfit: 'plate', c1: '#2c4fa3', expr: 'normal', prop: 'flag' },
  galileo: { skin: SKIN.fair, hair: 'sides', hairColor: brown, outfit: 'robe', c1: '#2b2b2b', c2: '#fbfbf7', beard: 'full', beardColor: brown, expr: 'normal', prop: 'telescope' },
  shakespeare: { skin: SKIN.fair, back: 'shoulder', hair: 'sides', hairColor: brown, outfit: 'doublet', c1: '#2b2b2b', beard: 'goatee', beardColor: brown, expr: 'smile', acc: ['earring'], prop: 'quill' },
  robinhood: { skin: SKIN.fair, hair: 'short', hairColor: brown, outfit: 'tunic', c1: '#3f8a3a', c2: '#8a5a32', hat: 'feather', hatColor: '#3f8a3a', beard: 'goatee', beardColor: brown, expr: 'wink', prop: 'bow' },

  // ---- 戦国 ----
  nobunaga: { skin: SKIN.fair, hair: 'topknot', hairColor: black, outfit: 'military', c1: '#2b2b2b', c2: '#c0392b', beard: 'mustache', beardColor: black, expr: 'cool', prop: 'gun' },
  hideyoshi: { skin: SKIN.tan, outfit: 'kimono', c1: '#e6b422', c2: '#c0392b', hat: 'kabuto', hatColor: '#2b2b2b', crest: 'sun', beard: 'mustache', beardColor: black, expr: 'grin', prop: 'gourd' },
  ieyasu: { skin: SKIN.fair, hair: 'topknot', hairColor: black, outfit: 'kimono', c1: '#6b4a2a', c2: '#2b2b2b', expr: 'calm', prop: 'sensu' },
  yukimura: { skin: SKIN.fair, outfit: 'yoroi', c1: '#d23a2a', c2: '#2b2b2b', hat: 'kabuto', hatColor: '#d23a2a', crest: 'antler', expr: 'angry', prop: 'spear' },
  hanzo: { skin: SKIN.fair, outfit: 'ninja', c1: '#2e3440', c2: '#7b5ea7', hat: 'ninja', hatColor: '#2e3440', expr: 'cool', prop: 'shuriken' },
  keiji: { skin: SKIN.fair, back: 'tail', hair: 'spiky', hairColor: '#8a3a2a', outfit: 'kimono', c1: '#e5534b', c2: '#f2c94c', expr: 'grin', prop: 'kiseru' },

  // ---- 江戸・幕末 ----
  ryoma: { skin: SKIN.fair, back: 'tail', hair: 'messy', hairColor: black, outfit: 'kimono', c1: '#2b2b2b', c2: '#5a5a5a', expr: 'grin', prop: 'pistol' },
  musashi: { skin: SKIN.tan, back: 'shoulder', hair: 'messy', hairColor: black, outfit: 'kimono', c1: '#7a5a3a', c2: '#2b2b2b', beard: 'stubble', beardColor: black, expr: 'cool', prop: 'twoswords' },
  hijikata: { skin: SKIN.fair, hair: 'side', hairColor: black, outfit: 'haori', expr: 'cool', prop: 'katana' },
  hokusai: { skin: SKIN.fair, hair: 'sides', hairColor: grey, outfit: 'kimono', c1: '#5a6a7a', c2: '#2b2b2b', expr: 'happy', acc: ['old'], prop: 'wave' },
  okita: { skin: SKIN.pale, back: 'ponytail', hair: 'short', hairColor: black, outfit: 'haori', expr: 'smile', prop: 'katana' },

  // ---- 近代 ----
  einstein: { skin: SKIN.fair, back: 'wild', hairColor: white, outfit: 'suit', c1: '#8a8f98', c2: '#3a3a44', beard: 'mustache', beardColor: white, expr: 'tongue', acc: ['old'] },
  napoleon: { skin: SKIN.fair, hair: 'short', hairColor: dark, outfit: 'military', c1: '#2c3e7a', c2: '#c0392b', hat: 'bicorne', expr: 'cool' },
  mozart: { skin: SKIN.fair, hair: 'wig', hairColor: white, outfit: 'frock', c1: '#c0392b', expr: 'happy', prop: 'note' },
  edison: { skin: SKIN.fair, hair: 'side', hairColor: grey, outfit: 'suit', c1: '#3a3a44', c2: '#2c3e7a', expr: 'smile', prop: 'bulb' },
  nightingale: { skin: SKIN.fair, hair: 'mid', hairColor: brown, outfit: 'dress', c1: '#3a3a44', c2: '#fbfbf7', hat: 'kerchief', hatColor: '#fbfbf7', expr: 'smile', prop: 'lamp' },
  gogh: { skin: SKIN.fair, hair: 'short', hairColor: red, outfit: 'suit', c1: '#3f6fb0', c2: '#f2c94c', beard: 'full', beardColor: red, expr: 'normal', acc: ['bandage'], prop: 'sunflower' },

  // ---- 未来 ----
  android: { creature: 'android' },
  oracle: { creature: 'oracle' },
  cyberbanchou: { skin: SKIN.fair, hair: 'pompadour', hairColor: '#4a5a6a', outfit: 'cyber', c1: '#c0392b', acc: ['visor'], expr: 'cool', prop: 'fist' },
  marsgirl: { skin: SKIN.fair, back: 'bob', hair: 'short', hairColor: pink, outfit: 'spacesuit', c1: '#e5534b', hat: 'space', expr: 'grin' },
  alien: { creature: 'alien' },
  robodog: { creature: 'robodog' },
  // 火星人の侵略で座るエイリアン、サイボーグ化した子
  martian: { creature: 'martian' },
  cyborg: { creature: 'cyborg' },

  // ---- 現代の生徒 ----
  baseball: { hair: 'buzz', hairColor: black, outfit: 'uniform', c1: '#2c4fa3', expr: 'grin', prop: 'bat' },
  soccer: { hair: 'short', hairColor: brown, outfit: 'jersey', c1: '#2f7fd8', c2: '#fff', expr: 'grin', prop: 'soccer' },
  basket: { hair: 'spiky', hairColor: dark, outfit: 'tank', c1: '#e5534b', c2: '#fff', expr: 'normal', prop: 'basketball' },
  track: { hair: 'short', hairColor: black, outfit: 'tank', c1: '#2f7fd8', c2: '#fff', hat: 'hachimaki', hatColor: '#e5534b', expr: 'grin', acc: ['sweat'], prop: 'stopwatch' },
  judo: { hair: 'buzz', hairColor: black, outfit: 'gi', expr: 'angry' },
  swim: { skin: SKIN.tan, outfit: 'bare', c1: SKIN.tan, hat: 'swimcap', hatColor: '#2f7fd8', expr: 'grin' },
  brass: { back: 'shoulder', hair: 'mid', hairColor: brown, outfit: 'sailor', c1: navy, c2: '#e5534b', expr: 'smile', prop: 'trumpet' },
  artclub: { hair: 'short', hairColor: dark, outfit: 'smock', c1: '#f6f1e4', hat: 'beret', hatColor: '#c0392b', expr: 'smile', prop: 'brush' },
  lit: { photo: 'katsu.jpg' },
  band: { back: 'shoulder', hair: 'messy', hairColor: '#5a3a6a', outfit: 'tshirt', c1: '#2b2b2b', c2: '#e5534b', expr: 'cool', acc: ['earring'], prop: 'guitar' },
  drama: { back: 'ponytail', hair: 'short', hairColor: brown, outfit: 'sailor', c1: navy, c2: '#e5534b', expr: 'surprised', prop: 'theater' },
  dance: { back: 'ponytail', hair: 'short', hairColor: blond, outfit: 'tshirt', c1: '#f59ac2', c2: '#fff', hat: 'cap', hatColor: '#2b2b2b', expr: 'wink', prop: 'mic' },
  nerd: { hair: 'side', hairColor: black, outfit: 'gakuran', acc: ['round'], expr: 'normal', prop: 'tango' },
  science: { hair: 'messy', hairColor: dark, outfit: 'labcoat', c1: '#7fb2d9', acc: ['glasses'], expr: 'grin', prop: 'flask' },
  shogi: { hair: 'buzz', hairColor: black, outfit: 'gakuran', expr: 'calm', prop: 'shogi' },
  otaku: { hair: 'messy', hairColor: black, outfit: 'hoodie', c1: '#7b8fa6', acc: ['round'], expr: 'happy', prop: 'gamepad' },
  council: { hair: 'side', hairColor: black, outfit: 'blazer', c1: '#2c3e66', c2: '#c0392b', acc: ['glasses', 'armband'], expr: 'smile', prop: 'clipboard' },
  rep: { back: 'twin', hair: 'short', hairColor: black, outfit: 'sailor', c1: navy, c2: '#e5534b', acc: ['glasses'], expr: 'shout' },
  gyaru: { back: 'long', hair: 'mid', hairColor: blond, skin: SKIN.tan, outfit: 'blazer', c1: '#c9b48a', c2: '#e5534b', acc: ['earring'], expr: 'wink', prop: 'peace' },
  clown: { hair: 'spiky', hairColor: brown, outfit: 'gakuran', hat: 'party', hatColor: '#e5534b', expr: 'tongue' },
  tennen: { back: 'bob', hair: 'short', hairColor: '#c98d4a', outfit: 'sailor', c1: navy, c2: '#e5534b', acc: ['flower', 'ahoge'], expr: 'sleepy' },
  kitaku: { hair: 'short', hairColor: black, outfit: 'gakuran', expr: 'happy', acc: ['sweat'], prop: 'bag' },
  quiet: { hair: 'side', hairColor: dark, outfit: 'gakuran', expr: 'sleepy' },
  yankee: { hair: 'pompadour', hairColor: black, outfit: 'longran', c1: '#c0392b', expr: 'cool' },
  sukeban: { back: 'long', hair: 'mid', hairColor: '#8a4a2a', outfit: 'sailor', c1: '#222', c2: '#c0392b', expr: 'cool', acc: ['mask'], prop: 'yoyo' },
  furyo: { hair: 'spiky', hairColor: blond, outfit: 'longran', c1: '#f6f4ee', acc: ['plaster'], expr: 'angry', prop: 'fist' },
  bosozoku: { hair: 'pompadour', hairColor: '#8a4a2a', outfit: 'tokko', hat: 'hachimaki', hatColor: '#e5534b', expr: 'shout' },
  returnee: { back: 'long', hair: 'mid', hairColor: brown, outfit: 'blazer', c1: '#2c3e66', c2: '#2f7fd8', expr: 'smile', prop: 'plane' },
  childstar: { back: 'bob', hair: 'short', hairColor: '#7a4e2e', outfit: 'dress', c1: '#f59ac2', c2: '#fff', acc: ['shadesup'], expr: 'wink', prop: 'clapper' },
  topscore: { hair: 'side', hairColor: black, outfit: 'gakuran', hat: 'hachimaki', hatColor: '#e5534b', acc: ['glasses'], expr: 'angry', prop: 'pencil' },
  esports: { hair: 'messy', hairColor: '#3a6ad0', outfit: 'hoodie', c1: '#2b2b2b', acc: ['headset'], expr: 'cool', prop: 'gamepad' },
  influencer: { back: 'long', hair: 'mid', hairColor: pink, outfit: 'tshirt', c1: '#fbfbf7', c2: '#f59ac2', expr: 'wink', prop: 'phone' },
  banchou: { hair: 'pompadour', hairColor: black, outfit: 'longran', c1: '#c0392b', hat: 'bancap', expr: 'cool', acc: ['scar'] },
  olympian: { hair: 'short', hairColor: black, outfit: 'jersey', c1: '#d23a2a', c2: '#fff', acc: ['medal'], expr: 'grin' },
  genius: { hair: 'messy', hairColor: brown, outfit: 'labcoat', c1: '#f2c94c', acc: ['round', 'ahoge'], expr: 'happy', prop: 'atom' },
};
