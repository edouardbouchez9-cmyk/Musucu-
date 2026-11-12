/**
 * R5 – 1RM estimé (e1RM).
 *
 * e1RM = charge × (1 + (reps + RIR) / 30), seulement si reps + RIR ≤ 12.
 * L'e1RM d'une séance est celui de sa meilleure série de travail.
 * L'e1RM lissé est la moyenne des N dernières séances calculables.
 * Charge prescrite = e1RM lissé / (1 + (reps cible + RIR cible) / 30).
 *
 * Quand l'utilisateur n'a pas saisi le RIR, le moteur suppose qu'il a respecté
 * le RIR cible de l'exercice.
 */
import { arrondirAuPasInferieur, nettoyer } from './nombres'
import type { ParametresMoteur } from './parametres'
import type { SeanceExercice, SerieRealisee } from './types'

type ParamsR5 = ParametresMoteur['r5']

export function e1rmSerie(serie: SerieRealisee, rirParDefaut: number, p: ParamsR5): number | null {
  if (serie.type === 'echauffement') return null
  if (serie.reps <= 0 || serie.charge <= 0) return null
  const rir = serie.rir ?? rirParDefaut
  if (serie.reps + rir > p.repsPlusRirMax) return null
  return nettoyer(serie.charge * (1 + (serie.reps + rir) / p.diviseur))
}

export function e1rmSeance(seance: SeanceExercice, rirParDefaut: number, p: ParamsR5): number | null {
  let meilleur: number | null = null
  for (const serie of seance.series) {
    const e = e1rmSerie(serie, rirParDefaut, p)
    if (e !== null && (meilleur === null || e > meilleur)) meilleur = e
  }
  return meilleur
}

export interface PointE1rm {
  seanceId: string
  date: string
  e1rm: number
  e1rmLisse: number
}

/** Courbe d'e1RM, triée de la plus ancienne à la plus récente séance. */
export function courbeE1rm(historique: SeanceExercice[], rirParDefaut: number, p: ParamsR5): PointE1rm[] {
  const tries = [...historique].sort((a, b) => a.date.localeCompare(b.date))
  const points: PointE1rm[] = []
  const valeurs: number[] = []
  for (const seance of tries) {
    const e = e1rmSeance(seance, rirParDefaut, p)
    if (e === null) continue
    valeurs.push(e)
    const fenetre = valeurs.slice(-p.seancesLissage)
    const moyenne = fenetre.reduce((s, v) => s + v, 0) / fenetre.length
    points.push({ seanceId: seance.seanceId, date: seance.date, e1rm: e, e1rmLisse: nettoyer(moyenne) })
  }
  return points
}

/** e1RM lissé le plus récent, ou `null` si aucune séance ne permet de le calculer. */
export function e1rmLisse(historique: SeanceExercice[], rirParDefaut: number, p: ParamsR5): number | null {
  const courbe = courbeE1rm(historique, rirParDefaut, p)
  return courbe.length > 0 ? courbe[courbe.length - 1].e1rmLisse : null
}

/** Charge à viser pour un objectif de reps et de RIR, arrondie à l'incrément inférieur. */
export function chargePourObjectif(
  e1rm: number,
  reps: number,
  rir: number,
  incrementKg: number,
  p: ParamsR5,
): number {
  return arrondirAuPasInferieur(e1rm / (1 + (reps + rir) / p.diviseur), incrementKg)
}
