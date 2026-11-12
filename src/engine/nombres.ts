/** Supprime les erreurs d'arrondi des flottants (0.1 + 0.2). */
export function nettoyer(x: number): number {
  return Math.round(x * 1000) / 1000
}

/** Arrondit au multiple de `pas` le plus proche. */
export function arrondirAuPas(x: number, pas: number): number {
  if (pas <= 0) return nettoyer(x)
  return nettoyer(Math.round(x / pas) * pas)
}

/** Arrondit au multiple de `pas` inférieur (choix prudent pour une charge). */
export function arrondirAuPasInferieur(x: number, pas: number): number {
  if (pas <= 0) return nettoyer(x)
  // La petite marge évite qu'un 82,4999999 tombe à 80.
  return nettoyer(Math.floor(x / pas + 1e-9) * pas)
}

/** Formate une charge à la française : 82,5 kg. */
export function formatKg(x: number): string {
  const n = nettoyer(x)
  const texte = Number.isInteger(n) ? String(n) : String(n).replace('.', ',')
  return `${texte} kg`
}

/** « 1 rep », « 3 reps ». */
export function formatReps(n: number): string {
  return `${n} rep${n > 1 ? 's' : ''}`
}
