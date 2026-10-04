import { CreaturePart } from './creatures';
import { AccPart, BeardPart, Face, HAIR, HairBackPart, HairFrontPart, HatPart, OutfitPart, PropPart, SKIN } from './parts';
import { ART, type HumanSpec } from './specs';

export function hasPortrait(art?: string): art is string {
  return !!art && art in ART;
}

/** 生徒カードのイラスト */
export function Portrait({ art }: { art: string }) {
  const spec = ART[art];
  return (
    <svg className="portrait" viewBox="0 6 100 94" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      {'photo' in spec ? (
        <image href={`${import.meta.env.BASE_URL}${spec.photo}`} x={0} y={6} width={100} height={94} preserveAspectRatio="xMidYMid slice" />
      ) : 'creature' in spec ? (
        <CreaturePart kind={spec.creature} />
      ) : (
        <Human spec={spec} />
      )}
    </svg>
  );
}

function Human({ spec }: { spec: HumanSpec }) {
  const skin = spec.skin ?? SKIN.light;
  const hairColor = spec.hairColor ?? HAIR.black;
  return (
    <g>
      {spec.back && <HairBackPart kind={spec.back} color={hairColor} />}
      <rect x={44.5} y={60} width={11} height={12} fill={skin} stroke="#4b3a2f" strokeWidth={1.4} />
      <OutfitPart kind={spec.outfit} c1={spec.c1 ?? '#3f7fd0'} c2={spec.c2 ?? '#f2c94c'} skin={skin} />
      <Face skin={skin} expr={spec.expr} liner={spec.liner} />
      {spec.hair && <HairFrontPart kind={spec.hair} color={hairColor} />}
      {spec.beard && <BeardPart kind={spec.beard} color={spec.beardColor ?? hairColor} />}
      {spec.acc?.map((a) => <AccPart key={a} kind={a} />)}
      {spec.hat && <HatPart kind={spec.hat} color={spec.hatColor ?? '#3f7fd0'} crest={spec.crest} />}
      {spec.prop && <PropPart kind={spec.prop} />}
    </g>
  );
}
