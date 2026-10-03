import type { Ability, Attr, EraId, Rarity, RoleId, Tag } from '../types';

/** 歴史カード（各時代のカードプール）。1枚につき1人しか存在せず、早い者勝ち */
export interface CardDef {
  id: string;
  name: string;
  title: string;
  era: EraId;
  rarity: Rarity;
  icon: string;
  power: number;
  attrs: Attr[];
  tags: Tag[];
  ability?: Ability;
  flavor: string;
}

/** 属性の略記：s=📚勉強 p=🏃運動 a=🎨芸術 c=👑人望 f=👊喧嘩 */
const ATTR_CODE: Record<string, Attr> = { s: 'study', p: 'sports', a: 'art', c: 'charm', f: 'fight' };
export function parseAttrs(code: string): Attr[] {
  return code.split('').map((ch) => ATTR_CODE[ch]);
}

const aura = (attr: Attr, amount: number): Ability => ({ kind: 'aura', attr, amount });
const boost = (attr: Attr, amount: number): Ability => ({ kind: 'boost', attr, amount });
const roleB = (role: RoleId, mult: number): Ability => ({ kind: 'roleBonus', role, mult });
const income = (amount: number): Ability => ({ kind: 'income', amount });
const guard = (ratio: number): Ability => ({ kind: 'guard', ratio });

type Row = [id: string, name: string, title: string, rarity: Rarity, icon: string, power: number, attrs: string, tags: Tag[], ability: Ability | undefined, flavor: string];

function era(eraId: EraId, list: Row[]): CardDef[] {
  return list.map(([id, name, title, rarity, icon, power, attrs, tags, ability, flavor]) => ({
    id,
    name,
    title,
    era: eraId,
    rarity,
    icon,
    power,
    attrs: parseAttrs(attrs),
    tags,
    ability,
    flavor,
  }));
}

// 強さの目安：数値×属性の数。N≒6〜9 / R≒12〜16 / SR≒16〜22 / SSR≒24〜30
// 👊（喧嘩）を持つのはヤンキー気質の者だけで、彼らは📚（勉強）を持たない
export const CARDS: CardDef[] = [
  ...era('cretaceous', [
    ['trex', 'ティラノサウルス', '暴君竜', 'SSR', '🦖', 10, 'pf', ['恐竜', 'ヤンキー'], boost('fight', 4), '腕は短いが噛む力は時空最強。給食の時間が一番こわい。'],
    ['triceratops', 'トリケラトプス', '三本角の重戦車', 'SR', '🦏', 7, 'pfc', ['恐竜', 'ヤンキー'], undefined, '角で他校の自転車を3台まとめて止めた。'],
    ['brachio', 'ブラキオサウルス', '優しい巨人', 'SR', '🦕', 8, 'pc', ['恐竜'], aura('charm', 1), '高い所からクラス全員を見守る。窓拭きも担当。'],
    ['spino', 'スピノサウルス', '川の王者', 'SR', '🐊', 9, 'pf', ['恐竜', 'ヤンキー'], boost('sports', 2), '水泳大会では誰も勝てない。'],
    ['ptera', 'プテラノドン', '空の支配者', 'R', '🦅', 8, 'p', ['恐竜'], boost('sports', 3), '屋上が定位置。遅刻ギリギリでも飛んでくる。'],
    ['raptor', 'ヴェロキラプトル', '知恵ある狩人', 'R', '🦎', 6, 'pf', ['恐竜', 'ヤンキー'], undefined, '群れで行動する。最近ドアの開け方を覚えた。'],
    ['stego', 'ステゴサウルス', '背中のアーティスト', 'R', '🦕', 5, 'paf', ['恐竜', 'ヤンキー'], undefined, '背中の板の配色が美術部で話題。'],
    ['ankylo', 'アンキロサウルス', '生きた要塞', 'R', '🐢', 7, 'f', ['恐竜', 'ヤンキー'], guard(0.2), '尻尾のハンマーでクラスを守る。'],
  ]),
  ...era('egypt', [
    ['cleopatra', 'クレオパトラ7世', '絶世の美女', 'SSR', '👸', 8, 'sac', ['王族'], roleB('leader', 2.0), '7か国語を話す女王。委員長になれば全員がひれ伏す。'],
    ['ramesses', 'ラムセス2世', '建築王', 'SR', '🤴', 7, 'spc', ['王族'], undefined, '自分の像を校庭に建てたがる。'],
    ['tut', 'ツタンカーメン', '黄金の少年王', 'SR', '🏺', 6, 'ac', ['王族'], income(1), '黄金のマスクが輝く。お小遣いが桁違い。'],
    ['imhotep', 'イムホテプ', '最初の建築家', 'SR', '📐', 9, 'sa', ['学者'], undefined, 'ピラミッドを設計した天才医師。'],
    ['nefertiti', 'ネフェルティティ', '美しき王妃', 'R', '💎', 7, 'ac', ['王族'], undefined, '胸像が美術室に飾られている。'],
    ['hatshepsut', 'ハトシェプスト', '女性ファラオ', 'R', '🦅', 6, 'sc', ['王族'], aura('charm', 1), '付け髭がトレードマーク。'],
    ['mason', 'ピラミッドの石工', '巨石運びの達人', 'R', '🧱', 5, 'spa', [], undefined, '2トンの石も運ぶ。綱引きの最終兵器。'],
  ]),
  ...era('greece', [
    ['alexander', 'アレクサンドロス大王', '征服王', 'SSR', '🐎', 8, 'spc', ['王族', '武将'], boost('charm', 3), 'アリストテレスの教え子。10年で世界の半分を手に入れた。'],
    ['caesar', 'ユリウス・カエサル', '賽は投げられた', 'SSR', '🏛️', 8, 'spac', ['武将'], roleB('leader', 2.0), '来た、見た、勝った。学級会も即決。'],
    ['socrates', 'ソクラテス', '無知の知', 'SR', '🧔', 8, 'sc', ['学者'], aura('study', 1), '質問攻めで周りの学力まで上がる。'],
    ['archimedes', 'アルキメデス', 'ユリイカ！', 'SR', '🛁', 10, 's', ['学者'], boost('study', 3), '風呂でひらめいて裸で走り出す。'],
    ['aristotle', 'アリストテレス', '万学の祖', 'SR', '📜', 7, 'sac', ['学者'], roleB('study', 2.0), '学習係を任せると本領発揮。'],
    ['leonidas', 'レオニダス', 'スパルタの王', 'R', '🛡️', 7, 'pc', ['王族', '武将'], undefined, '300人で大軍を止めた男。'],
    ['pythagoras', 'ピタゴラス', '数の神秘', 'R', '📐', 7, 'sa', ['学者'], undefined, '豆が大嫌い。'],
    ['spartacus', 'スパルタクス', '剣闘士の反逆者', 'R', '⚔️', 6, 'pfc', ['ヤンキー'], undefined, '奴隷剣闘士から反乱軍のリーダーへ。'],
    ['homer', 'ホメロス', '吟遊詩人', 'R', '🎼', 8, 'sa', ['芸術家'], undefined, '国語の授業で叙事詩を丸ごと暗唱する。'],
  ]),
  ...era('china', [
    ['zhuge', '諸葛亮孔明', '臥龍', 'SSR', '🪶', 10, 'sac', ['学者'], boost('study', 3), '天下三分の計で定期テストの山も当てる。'],
    ['lubu', '呂布', '人中の呂布', 'SSR', '🐎', 10, 'pf', ['武将', 'ヤンキー'], boost('fight', 5), '三国志最強。ただし裏切り癖あり。'],
    ['guanyu', '関羽', '美髯公', 'SR', '🧔', 7, 'spc', ['武将'], undefined, '長い髭と青龍偃月刀。義理堅い。'],
    ['caocao', '曹操', '乱世の奸雄', 'SR', '🗡️', 6, 'spac', ['武将', '芸術家'], undefined, '詩人としても一流。'],
    ['qin', '始皇帝', '最初の皇帝', 'SR', '🐲', 8, 'sc', ['王族'], roleB('leader', 1.8), '法で治める。委員長にすると校則が激増。'],
    ['confucius', '孔子', '論語の人', 'SR', '📖', 8, 'sc', ['学者'], aura('study', 1), '子曰く、学びて時に之を習う。'],
    ['liubei', '劉備', '仁徳の君主', 'R', '🤝', 6, 'sc', ['王族'], aura('charm', 1), '人柄だけで仲間が集まる。'],
    ['zhangfei', '張飛', '燕人', 'R', '😤', 8, 'pf', ['武将', 'ヤンキー'], undefined, '酒癖が悪い。長坂橋で一喝。'],
    ['sunzi', '孫子', '兵法家', 'R', '♟️', 8, 's', ['学者'], aura('study', 1), '戦わずして勝つ。'],
  ]),
  ...era('heian', [
    ['seimei', '安倍晴明', '陰陽師', 'SSR', '🔮', 8, 'sac', ['学者'], guard(0.4), '式神と結界でクラスを災いから守る。'],
    ['murasaki', '紫式部', '源氏物語の作者', 'SR', '🖋️', 9, 'sa', ['芸術家'], boost('art', 2), '世界最古級の長編小説家。'],
    ['seishonagon', '清少納言', '枕草子の作者', 'SR', '📝', 7, 'sac', ['芸術家'], aura('art', 1), '春はあけぼの。センスがクラスに伝染する。'],
    ['yoshitsune', '源義経', '八艘飛び', 'SR', '🏯', 9, 'pc', ['武将'], boost('sports', 2), '崖も駆け下りる身軽さ。'],
    ['michizane', '菅原道真', '学問の神様', 'SR', '⛩️', 9, 'sa', ['学者'], boost('study', 3), '受験生に大人気。怒らせると雷が落ちる。'],
    ['benkei', '武蔵坊弁慶', '仁王立ち', 'R', '🪓', 8, 'pf', ['武将', 'ヤンキー'], undefined, '義経のためなら立ったままでも戦う。'],
    ['komachi', '小野小町', '絶世の歌人', 'R', '🌸', 7, 'ac', ['芸術家'], undefined, '百夜通っても会えない。'],
    ['masakado', '平将門', '新皇', 'R', '🔥', 6, 'pfc', ['武将', 'ヤンキー'], undefined, '関東で勝手に天皇を名乗った元祖ヤンキー。'],
  ]),
  ...era('europe', [
    ['davinci', 'レオナルド・ダ・ヴィンチ', '万能の天才', 'SSR', '🎨', 7, 'spac', ['芸術家', '学者'], boost('art', 3), 'モナ・リザも空飛ぶ機械も。文化祭の目玉。'],
    ['joan', 'ジャンヌ・ダルク', 'オルレアンの乙女', 'SR', '⚜️', 8, 'pc', ['武将'], roleB('cheer', 2.0), '応援団長にすればクラス全員が奮い立つ。'],
    ['michelangelo', 'ミケランジェロ', '神のごとき', 'SR', '🗿', 8, 'spa', ['芸術家'], undefined, '天井画を一人で描き切る体力派アーティスト。'],
    ['galileo', 'ガリレオ・ガリレイ', 'それでも地球は回る', 'SR', '🔭', 10, 's', ['学者'], boost('study', 3), '先生にも平気で反論する。'],
    ['shakespeare', 'シェイクスピア', '劇作家', 'SR', '🎭', 8, 'sac', ['芸術家'], undefined, '演劇部の脚本を書いてくれる。'],
    ['richard', 'リチャード1世', '獅子心王', 'R', '🦁', 7, 'pc', ['王族', '武将'], undefined, 'ほとんど国にいなかった王。'],
    ['robinhood', 'ロビン・フッド', 'シャーウッドの義賊', 'R', '🏹', 6, 'pfc', ['ヤンキー'], undefined, '弓の名手。弱い者の味方。'],
    ['columbus', 'コロンブス', '大航海者', 'R', '⛵', 5, 'spc', [], undefined, '遠足で道に迷う…いや、新大陸を見つける。'],
  ]),
  ...era('sengoku', [
    ['nobunaga', '織田信長', '第六天魔王', 'SSR', '🔥', 9, 'spc', ['武将'], aura('sports', 1), '天下布武。クラス全員が熱くなる。'],
    ['hideyoshi', '豊臣秀吉', '天下人', 'SR', '🐒', 7, 'sc', ['武将'], income(1), '草履を温めて大出世。金回りがいい。'],
    ['ieyasu', '徳川家康', '忍耐の人', 'SR', '🦉', 7, 'spc', ['武将'], guard(0.3), '鳴くまで待とう。失点をじっと耐える。'],
    ['shingen', '武田信玄', '甲斐の虎', 'SR', '🐯', 7, 'spc', ['武将'], undefined, '風林火山。'],
    ['kenshin', '上杉謙信', '越後の龍', 'SR', '🐉', 9, 'pc', ['武将'], undefined, '敵に塩を送る義の人。'],
    ['yukimura', '真田幸村', '日本一の兵', 'SR', '🦌', 10, 'p', ['武将'], boost('sports', 4), '赤備えで突撃。'],
    ['masamune', '伊達政宗', '独眼竜', 'R', '🌙', 5, 'spac', ['武将'], undefined, 'おしゃれで料理上手。'],
    ['hanzo', '服部半蔵', '影の忍', 'R', '🥷', 8, 'sp', ['忍者'], undefined, '気づくと後ろの席にいる。'],
    ['rikyu', '千利休', '茶聖', 'R', '🍵', 9, 'a', ['芸術家'], boost('art', 3), '茶道部を一夜で全国レベルに。'],
    ['keiji', '前田慶次', '傾奇者', 'R', '🎴', 5, 'pafc', ['武将', 'ヤンキー'], undefined, '派手好きの元祖かぶき者。'],
  ]),
  ...era('edo', [
    ['ryoma', '坂本龍馬', '日本の夜明け', 'SSR', '🌅', 8, 'spc', [], aura('charm', 1), '犬猿の仲のクラスメイトも仲直りさせる。'],
    ['musashi', '宮本武蔵', '剣聖', 'SR', '⚔️', 7, 'paf', ['武将', 'ヤンキー'], boost('fight', 2), '二刀流。水墨画もうまい。'],
    ['saigo', '西郷隆盛', '西郷どん', 'SR', '🐕', 9, 'pc', ['武将'], undefined, '犬を連れて登校する。'],
    ['hijikata', '土方歳三', '鬼の副長', 'SR', '👹', 7, 'pfc', ['武将', 'ヤンキー'], roleB('discipline', 2.0), '局中法度で風紀を守る。'],
    ['hokusai', '葛飾北斎', '画狂老人', 'SR', '🌊', 10, 'a', ['芸術家'], boost('art', 4), '引っ越し93回。'],
    ['okita', '沖田総司', '天才剣士', 'R', '🌸', 8, 'pc', ['武将'], undefined, '三段突き。体が弱いのが心配。'],
    ['inou', '伊能忠敬', '歩く測量士', 'R', '🗺️', 7, 'sp', ['学者'], undefined, '日本中を歩いて地図を作った。マラソン大会の星。'],
    ['gennai', '平賀源内', '江戸の発明家', 'R', '⚡', 5, 'sac', ['学者'], undefined, 'エレキテルで理科室を感電させる。'],
    ['jirocho', '清水次郎長', '海道一の大親分', 'R', '🎲', 7, 'fc', ['ヤンキー'], undefined, '義理人情に厚い侠客。'],
  ]),
  ...era('modern', [
    ['einstein', 'アインシュタイン', '相対性理論', 'SSR', '🧑‍🔬', 10, 'sa', ['学者'], boost('study', 5), '舌を出して写真に写る。数学は昔から得意。'],
    ['napoleon', 'ナポレオン', '皇帝', 'SSR', '🎩', 8, 'spc', ['王族', '武将'], roleB('leader', 2.0), '余の辞書に不可能はない。3時間睡眠。'],
    ['newton', 'アイザック・ニュートン', '万有引力', 'SR', '🍎', 10, 's', ['学者'], boost('study', 3), 'リンゴを見ると考え込む。'],
    ['mozart', 'モーツァルト', '神童', 'SR', '🎹', 9, 'sa', ['芸術家'], boost('art', 2), '5歳で作曲。合唱コンクールの切り札。'],
    ['edison', 'エジソン', '発明王', 'SR', '💡', 8, 'sa', ['学者'], income(1), '特許料がどんどん入ってくる。'],
    ['curie', 'マリ・キュリー', '放射能の母', 'SR', '☢️', 10, 's', ['学者'], aura('study', 1), 'ノーベル賞を2回とった。'],
    ['nightingale', 'ナイチンゲール', '白衣の天使', 'SR', '🏥', 7, 'sc', [], guard(0.4), 'クラスの怪我人を全員看病する。'],
    ['beethoven', 'ベートーヴェン', '楽聖', 'R', '🎼', 9, 'a', ['芸術家'], boost('art', 3), '耳が聞こえなくても作曲。怒りっぽい。'],
    ['gogh', 'ゴッホ', '炎の画家', 'R', '🌻', 9, 'a', ['芸術家'], boost('art', 2), 'ひまわりばかり描く。'],
    ['noguchi', '野口英世', '細菌学者', 'R', '🔬', 8, 's', ['学者'], guard(0.2), '保健室の頼れる相談相手。'],
    ['lincoln', 'リンカーン', '奴隷解放の父', 'R', '🎩', 6, 'spc', [], undefined, '人民の、人民による、人民のための学級会。'],
  ]),
  ...era('future', [
    ['android', 'アンドロイドQ-7', '量子演算型', 'SSR', '🤖', 9, 'spa', ['未来'], undefined, 'テストは全問正解。ただし作文が苦手。'],
    ['cyberbanchou', 'サイボーグ番長', '鋼鉄の番長', 'SR', '🦾', 8, 'pfc', ['未来', 'ヤンキー'], boost('fight', 2), '未来の番長は改造済み。'],
    ['marsgirl', '火星生まれのミラ', '赤い星の少女', 'SR', '🪐', 5, 'spac', ['未来'], undefined, '地球の重力が重くて最初はへばっていた。'],
    ['timecop', '時空警察エージェント', '時間の番人', 'SR', '🕶️', 8, 'sp', ['未来'], guard(0.3), '歴史改変を見張っている…はずが転校してきた。'],
    ['alien', '宇宙人留学生ゾゾ', '交換留学生', 'R', '👽', 7, 'sa', ['未来'], undefined, '触角でテレパシー。'],
    ['aiidol', 'AIアイドル・ネオン', 'バーチャル歌姫', 'R', '🎤', 7, 'ac', ['未来', '芸術家'], undefined, 'ホログラムで歌って踊る。'],
    ['robodog', 'ロボ犬ポチ2300', '忠犬ロボ', 'R', '🐕', 7, 'pc', ['未来', '動物'], undefined, '飼育係が大好き。'],
    ['descendant', '担任の子孫', '未来の孫', 'R', '🧒', 3, 'spac', ['未来'], income(1), '先生の顔にそっくり。お小遣いを持ってくる。'],
  ]),
];

export const CARD_MAP: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));
