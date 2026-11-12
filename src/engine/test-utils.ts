import type { ExerciceMoteur, SeanceExercice, SerieRealisee } from './types'

export function exercice(partiel: Partial<ExerciceMoteur> = {}): ExerciceMoteur {
  return {
    id: 'dc',
    nom: 'Développé couché',
    type: 'poly',
    zone: 'haut',
    repsMin: 8,
    repsMax: 10,
    rirCible: 2,
    incrementKg: 2.5,
    ...partiel,
  }
}

/** Raccourci : `s(80, 10, 2)` = 80 kg × 10 reps, RIR 2. */
export function s(charge: number, reps: number, rir: number | null = null, type: SerieRealisee['type'] = 'normale'): SerieRealisee {
  return { charge, reps, rir, type }
}

export function seance(
  date: string,
  series: SerieRealisee[],
  fourchette: [number, number] = [8, 10],
  seanceId = `seance-${date}`,
): SeanceExercice {
  return { seanceId, date, repsMin: fourchette[0], repsMax: fourchette[1], series }
}
