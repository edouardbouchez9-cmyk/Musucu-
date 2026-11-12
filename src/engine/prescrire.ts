/**
 * Point d'entrée du moteur : choisit la règle à appliquer pour un exercice.
 *
 * 1. Aucun historique → l'utilisateur choisit sa charge de départ.
 * 2. Dernière séance faite dans la même fourchette → R1 (double progression).
 * 3. Fourchette changée depuis → R5 fixe la charge à partir de l'e1RM lissé.
 */
import { formatKg, formatReps } from './nombres'
import type { ParametresMoteur } from './parametres'
import { appliquerR1, seriesDeTravail } from './r1-double-progression'
import { chargePourObjectif, e1rmLisse } from './r5-e1rm'
import type { ExerciceMoteur, Prescription, SeanceExercice } from './types'

export function prescrire(
  exercice: ExerciceMoteur,
  historique: SeanceExercice[],
  nbSeries: number,
  params: ParametresMoteur,
): Prescription {
  const utiles = historique
    .filter((s) => seriesDeTravail(s).length > 0)
    .sort((a, b) => b.date.localeCompare(a.date))
  const lisse = e1rmLisse(utiles, exercice.rirCible, params.r5)
  const fourchette = `${exercice.repsMin}–${exercice.repsMax}`

  if (utiles.length === 0) {
    return {
      exerciceId: exercice.id,
      regle: 'PREMIERE_SEANCE',
      series: Array.from({ length: nbSeries }, () => ({
        charge: null,
        reps: exercice.repsMin,
        rirCible: exercice.rirCible,
      })),
      explication:
        `Première séance : choisis une charge que tu peux soulever ${fourchette} fois ` +
        `en gardant ${formatReps(exercice.rirCible)} en réserve.`,
      details: { e1rmLisse: null },
    }
  }

  const derniere = utiles[0]
  const memeFourchette = derniere.repsMin === exercice.repsMin && derniere.repsMax === exercice.repsMax

  if (memeFourchette) {
    const r1 = appliquerR1(exercice, derniere, nbSeries, params.r1)
    return { ...r1, details: { ...r1.details, e1rmLisse: lisse, seanceSource: derniere.seanceId } }
  }

  // La fourchette a changé : R5 fixe la charge de départ.
  if (lisse === null) {
    return {
      exerciceId: exercice.id,
      regle: 'R5_DEPART',
      series: Array.from({ length: nbSeries }, () => ({
        charge: null,
        reps: exercice.repsMin,
        rirCible: exercice.rirCible,
      })),
      explication:
        `Nouvelle fourchette (${fourchette}) : ton historique ne permet pas d'estimer ton 1RM ` +
        `(séries au-delà de ${params.r5.repsPlusRirMax} reps + RIR). Choisis une charge pour ` +
        `${exercice.repsMin} reps en gardant ${formatReps(exercice.rirCible)} en réserve.`,
      details: { e1rmLisse: null, seanceSource: derniere.seanceId },
    }
  }

  const charge = chargePourObjectif(lisse, exercice.repsMin, exercice.rirCible, exercice.incrementKg, params.r5)
  return {
    exerciceId: exercice.id,
    regle: 'R5_DEPART',
    series: Array.from({ length: nbSeries }, () => ({
      charge,
      reps: exercice.repsMin,
      rirCible: exercice.rirCible,
    })),
    explication:
      `Nouvelle fourchette (${fourchette}) : ${formatKg(charge)} calculés depuis ton 1RM estimé ` +
      `(${formatKg(lisse)}) pour ${exercice.repsMin} reps avec ${formatReps(exercice.rirCible)} en réserve.`,
    details: { e1rmLisse: lisse, seanceSource: derniere.seanceId },
  }
}
