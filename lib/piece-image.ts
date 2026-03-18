export type PieceImageSignal = 'high-volume' | 'ascending' | 'emerging' | null;

export interface SelectedPieceImage {
  pieceType: string | null;
  signal: PieceImageSignal;
}

export function buildSelectedPieceImage(input: {
  type?: string | null;
  signal?: PieceImageSignal;
} | null): SelectedPieceImage | null {
  if (!input?.type) return null;

  return {
    pieceType: input.type,
    signal: input.signal ?? null,
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
