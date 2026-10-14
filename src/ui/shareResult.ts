import { className, finalRanking } from '../game/engine';
import { ERAS } from '../game/data/eras';
import { ATTR_ICON, type GameState, type Player, type Student } from '../game/types';
import { HASHTAG, SITE_NAME, SITE_URL } from '../site';

const W = 1200;
const H = 630;
const FONT = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Hiragino Sans", "Noto Sans JP", sans-serif';
const RARITY_RANK: Record<string, number> = { SSR: 3, SR: 2, R: 1, N: 0 };

/** 優勝クラスの顔ぶれ：時空転校生を先に、レアな子から */
function lineup(p: Player): Student[] {
  return [...p.students].sort(
    (a, b) => Number(b.era !== 'present') - Number(a.era !== 'present') || (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0) || b.mvp - a.mvp,
  );
}

/** シェアの文面（画像に添える） */
export function shareText(s: GameState): string {
  const w = finalRanking(s)[0];
  const stars = lineup(w).filter((x) => x.era !== 'present').slice(0, 3).map((x) => x.name);
  const with_ = stars.length ? `${stars.join('・')}たちと` : '';
  return `${w.name}の${className(w.id, s.year)}が、${with_}${w.points}ptで時空最強クラスに！ #${HASHTAG}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** 幅に収まるよう文字を小さくして書く */
function fitText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, size: number, weight = 700) {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (s > 10 && ctx.measureText(text).width > maxW) {
    s -= 1;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  ctx.fillText(text, x, y);
}

/** 結果の画像（1200×630。SNSのカードと同じ比率） */
export async function renderResult(s: GameState): Promise<Blob> {
  try {
    await Promise.all([document.fonts.load(`900 40px ${FONT}`), document.fonts.load(`700 20px ${FONT}`)]);
  } catch {
    /* フォントが読めなくても、ほかの字体で書く */
  }
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  const ranking = finalRanking(s);
  const w = ranking[0];

  // 黒板
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1f3a2e');
  g.addColorStop(1, '#122019');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#b08850';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, W - 14, H - 14);

  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd43b';
  fitText(ctx, `🏆 時空最強クラス決定！${s.trial ? '（体験版）' : ''}`, 48, 78, 700, 40, 900);

  // 優勝クラスと点数
  ctx.fillStyle = '#ffffff';
  fitText(ctx, `${w.name}の ${className(w.id, s.year)}`, 48, 148, 820, 56, 900);
  ctx.textAlign = 'right';
  ctx.fillStyle = w.color;
  fitText(ctx, `${w.points}pt`, W - 48, 148, 280, 72, 900);

  // 顔ぶれ（最大10人・5人×2段）
  const cols = 5;
  const cw = 208;
  const ch = 158;
  const gap = 16;
  const x0 = (W - (cols * cw + (cols - 1) * gap)) / 2;
  const y0 = 180;
  lineup(w)
    .slice(0, 10)
    .forEach((st, i) => {
      const x = x0 + (i % cols) * (cw + gap);
      const y = y0 + Math.floor(i / cols) * (ch + gap);
      const era = ERAS.find((e) => e.id === st.era);
      roundRect(ctx, x, y, cw, ch, 16);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = era?.color ?? '#8aa';
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.font = `48px ${FONT}`;
      ctx.fillStyle = '#fff';
      ctx.fillText(st.icon || era?.icon || '🙂', x + cw / 2, y + 62);
      fitText(ctx, st.name, x + cw / 2, y + 100, cw - 16, 24);
      ctx.fillStyle = '#ffe9a8';
      fitText(ctx, st.attrs.map((a) => ATTR_ICON[a]).join(''), x + cw / 2, y + 136, cw - 16, 24, 400);
      if (st.rarity !== 'N') {
        ctx.textAlign = 'left';
        ctx.fillStyle = st.rarity === 'SSR' ? '#ffd43b' : st.rarity === 'SR' ? '#da77f2' : '#74c0fc';
        ctx.font = `900 16px ${FONT}`;
        ctx.fillText(st.rarity, x + 10, y + 24);
      }
    });

  // 2位以下と、ゲームの名前
  ctx.textAlign = 'left';
  ctx.fillStyle = '#cfe3d6';
  const medal = ['🥇', '🥈', '🥉', '4位', '5位'];
  fitText(ctx, ranking.slice(1).map((p, i) => `${medal[i + 1]} ${p.name} ${p.points}pt`).join('　'), 48, H - 44, 620, 24);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffffff';
  fitText(ctx, SITE_NAME, W - 48, H - 70, 440, 28, 900);
  ctx.fillStyle = '#9fc2ad';
  fitText(ctx, SITE_URL.replace(/^https:\/\//, '').replace(/\/$/, ''), W - 48, H - 38, 440, 20);

  return new Promise((ok, ng) => cv.toBlob((b) => (b ? ok(b) : ng(new Error('toBlob'))), 'image/png'));
}

/** 画像つきでシェア（スマホの共有シート）。共有できない環境では画像を保存する。結果：'shared' | 'downloaded' | 'cancelled' */
export async function shareResult(s: GameState): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await renderResult(s);
  const file = new File([blob], 'jikuu-saikyou-class.png', { type: 'image/png' });
  const text = `${shareText(s)}\n${SITE_URL}`;
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text, title: SITE_NAME });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

/** X（旧Twitter）の投稿画面を開くURL */
export function xIntentUrl(s: GameState): string {
  const q = new URLSearchParams({ text: shareText(s), url: SITE_URL });
  return `https://x.com/intent/post?${q}`;
}
