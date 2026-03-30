export type PieceImageSignal = 'high-volume' | 'ascending' | 'emerging' | null;

export interface SelectedPieceImage {
  pieceType: string | null;
  signal: PieceImageSignal;
}

type PieceImageResolverInput = {
  type?: string | null;
  pieceName?: string | null;
  category?: string | null;
  silhouette?: string | null;
};

function normalizePieceToken(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function includesAny(value: string, terms: string[]): boolean {
  return terms.some((term) => value.includes(term));
}

function resolveTypeFromText(text: string): string | null {
  if (!text) return null;

  if (includesAny(text, ['cigarette jean', 'cigarette jeans', 'slim jean', 'slim jeans'])) return 'straight-pant';
  if (includesAny(text, ['straight jean', 'straight jeans', 'jean', 'jeans', 'denim'])) return 'straight-pant';
  if (includesAny(text, ['wide leg', 'wide trouser', 'wide pant', 'palazzo', 'flare', 'flared'])) return 'trouser';
  if (includesAny(text, ['pant', 'pants', 'trouser', 'trousers'])) return 'straight-pant';
  if (includesAny(text, ['mini skirt'])) return 'mini-skirt';
  if (includesAny(text, ['skirt'])) return 'skirt';
  if (includesAny(text, ['slip dress'])) return 'slip-dress';
  if (includesAny(text, ['shirt dress'])) return 'shirt-dress';
  if (includesAny(text, ['sundress'])) return 'sundress';
  if (includesAny(text, ['babydoll'])) return 'babydoll-dress';
  if (includesAny(text, ['column dress'])) return 'column-dress';
  if (includesAny(text, ['maxi dress', 'gown'])) return 'maxi-dress';
  if (includesAny(text, ['midi dress', 'wrap dress', 'shift dress', 'dress'])) return 'midi-dress';
  if (includesAny(text, ['trench'])) return 'trench';
  if (includesAny(text, ['parka'])) return 'parka';
  if (includesAny(text, ['puffer'])) return 'puffer';
  if (includesAny(text, ['raincoat'])) return 'raincoat';
  if (includesAny(text, ['coat'])) return 'coat';
  if (includesAny(text, ['blazer'])) return 'blazer';
  if (includesAny(text, ['jacket', 'bomber'])) return 'jacket';
  if (includesAny(text, ['cardigan'])) return 'cardigan';
  if (includesAny(text, ['sweater', 'jumper', 'knit'])) return 'knit-sweater';
  if (includesAny(text, ['corset'])) return 'corset-top';
  if (includesAny(text, ['tank'])) return 'tank';
  if (includesAny(text, ['tunic'])) return 'tunic';
  if (includesAny(text, ['blouse'])) return 'blouse';
  if (includesAny(text, ['shirt'])) return 'top';
  if (includesAny(text, ['vest', 'waistcoat'])) return 'vest';
  if (includesAny(text, ['top'])) return 'top';

  return null;
}

function resolveTypeFromCategory(category: string): string | null {
  if (!category) return null;

  if (includesAny(category, ['bottom', 'pant', 'trouser', 'jean', 'denim'])) return 'straight-pant';
  if (includesAny(category, ['dress'])) return 'midi-dress';
  if (includesAny(category, ['outerwear', 'coat', 'jacket'])) return 'jacket';
  if (includesAny(category, ['knit'])) return 'knit-sweater';
  if (includesAny(category, ['top', 'shirt', 'blouse'])) return 'top';

  return null;
}

function resolveTypeFromSilhouette(silhouette: string, category: string): string | null {
  if (!silhouette) return null;

  if (includesAny(category, ['bottom', 'pant', 'trouser', 'jean', 'denim'])) {
    if (includesAny(silhouette, ['wide', 'flare'])) return 'trouser';
    return 'straight-pant';
  }

  if (includesAny(category, ['dress'])) {
    if (includesAny(silhouette, ['column'])) return 'column-dress';
    if (includesAny(silhouette, ['slip'])) return 'slip-dress';
    return 'midi-dress';
  }

  if (includesAny(category, ['outerwear', 'coat', 'jacket'])) {
    if (includesAny(silhouette, ['belted'])) return 'trench';
    if (includesAny(silhouette, ['cocoon'])) return 'coat';
    return 'jacket';
  }

  if (includesAny(category, ['knit'])) {
    if (includesAny(silhouette, ['fitted'])) return 'cardigan';
    return 'knit-sweater';
  }

  if (includesAny(category, ['top', 'shirt', 'blouse'])) {
    if (includesAny(silhouette, ['oversized'])) return 'tunic';
    return 'top';
  }

  return null;
}

export function resolvePieceImageType(input: PieceImageResolverInput | null): string | null {
  if (!input) return null;

  const rawType = normalizePieceToken(input.type);
  const pieceName = normalizePieceToken(input.pieceName);
  const category = normalizePieceToken(input.category);
  const silhouette = normalizePieceToken(input.silhouette);

  return (
    resolveTypeFromText(rawType) ??
    resolveTypeFromCategory(category) ??
    resolveTypeFromSilhouette(silhouette, category) ??
    resolveTypeFromText(pieceName) ??
    resolveTypeFromSilhouette(silhouette, pieceName) ??
    null
  );
}

export function buildSelectedPieceImage(input: {
  type?: string | null;
  pieceName?: string | null;
  category?: string | null;
  silhouette?: string | null;
  signal?: PieceImageSignal;
} | null): SelectedPieceImage | null {
  const pieceType = resolvePieceImageType(input);
  if (!pieceType) return null;

  return {
    pieceType,
    signal: input?.signal ?? null,
  };
}

export function parseSelectedPieceImage(raw: string | null | undefined): SelectedPieceImage | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SelectedPieceImage>;
    if (typeof parsed?.pieceType !== 'string' || parsed.pieceType.trim().length === 0) {
      return null;
    }

    return {
      pieceType: parsed.pieceType,
      signal:
        parsed.signal === 'high-volume' || parsed.signal === 'ascending' || parsed.signal === 'emerging'
          ? parsed.signal
          : null,
    };
  } catch {
    return null;
  }
}
