/**
 * CO2 ppm: dusuk = iyi hava. Grafikte "kalite" olarak yuksek cizgi = iyi olmasi icin 0-100 skora cevrilir.
 */
export function co2PpmToQualityScore(ppm: number): number {
  if (!Number.isFinite(ppm) || ppm <= 0) return 0;
  const clamped = Math.min(2200, Math.max(400, ppm));
  return Math.round(100 - ((clamped - 400) / 1800) * 100);
}

export function mapCo2SeriesToQualityScores(series: number[]): number[] {
  return series.map(co2PpmToQualityScore);
}

/**
 * react-native-chart-kit LineChart tek noktada boş/hatalı çizebiliyor; en az 2 nokta garanti et.
 * Etiket dizisi veri ile aynı uzunlukta olmalı.
 */
export function padLineChartPairs(
  scores: number[],
  labels: string[]
): { scores: number[]; labels: string[] } {
  const padLabel = (i: number) =>
    labels.length > 0 ? labels[Math.min(i, labels.length - 1)] : '—';

  if (scores.length >= 2) {
    return { scores: [...scores], labels: [...labels] };
  }
  if (scores.length === 1) {
    return {
      scores: [scores[0], scores[0]],
      labels: [padLabel(0), padLabel(0)],
    };
  }
  return {
    scores: [0, 0],
    labels: [padLabel(0), padLabel(0)],
  };
}
