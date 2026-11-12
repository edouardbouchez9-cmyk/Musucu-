/**
 * R1 – Double progression (moteur principal).
 *
 * - Toutes les séries atteignent R_max avec un RIR ≥ RIR cible :
 *   charge + incrément, objectif = R_min.
 * - Sinon : même charge, +1 rep sur la ou les séries les plus faibles.
 * - Si le plus petit incrément dépasse 10 % de la charge : la fourchette
 *   s'élargit (10–12 devient 10–15) avant chaque hausse de charge.
 *
 * Un RIR non saisi ne bloque pas la hausse : seules les reps comptent alors.
 */
import { arrondirAuPas, formatKg, formatReps, nettoyer } from './nombres'
import type { ParametresMoteur } from './parametres'
import type { ExerciceMoteur, Prescription, SeanceExercice, SerieCible, SerieRealisee } from './types'

type ParamsR1 = ParametresMoteur['r1']

/** Vrai quand le plus petit incrément disponible est trop gros pour cette charge. */
export function incrementTropGros(exercice: ExerciceMoteur, charge: number, p: ParamsR1): boolean {
  return exercice.incrementKg > charge * p.seuilIncrementTropGros
}

/** Haut de fourchette effectif, élargi si l'incrément est trop gros. */
export function repsMaxEffectif(exercice: ExerciceMoteur, charge: number, p: ParamsR1): number {
  return incrementTropGros(exercice, charge, p) ? exercice.repsMax + p.elargissementFourchette : exercice.repsMax
}

/**
 * Hausse de charge : valeur par défaut selon le type d'exercice, bornée entre
 * 2 et 5 % de la charge, puis arrondie à l'incrément disponible (au moins un incrément).
 */
export function calculerHausse(exercice: ExerciceMoteur, charge: number, p: ParamsR1): number {
  const pas = exercice.incrementKg
  if (incrementTropGros(exercice, charge, p)) return pas
  const base =
    exercice.zone === 'bas'
      ? p.incrementDefautBas
      : exercice.type === 'poly'
        ? p.incrementDefautPolyHaut
        : pas
  const borne = Math.min(Math.max(base, charge * p.incrementPctMin), charge * p.incrementPctMax)
  return Math.max(pas, arrondirAuPas(borne, pas))
}

export function seriesDeTravail(seance: SeanceExercice): SerieRealisee[] {
  return seance.series.filter((s) => s.type !== 'echauffement')
}

/** « la série 3 », « les séries 2 et 3 », « toutes les séries ». */
function nommerSeries(numeros: number[], total: number): string {
  if (numeros.length === total && total > 1) return 'toutes les séries'
  if (numeros.length === 1) return `la série ${numeros[0]}`
  const debut = numeros.slice(0, -1).join(', ')
  return `les séries ${debut} et ${numeros[numeros.length - 1]}`
}

export function appliquerR1(
  exercice: ExerciceMoteur,
  derniere: SeanceExercice,
  nbSeries: number,
  p: ParamsR1,
): Prescription {
  const travail = seriesDeTravail(derniere)
  const chargeRef = Math.max(...travail.map((s) => s.charge))
  const tropGros = incrementTropGros(exercice, chargeRef, p)
  const repsMax = repsMaxEffectif(exercice, chargeRef, p)
  const rirSaisi = travail.some((s) => s.rir !== null)

  const reussie = (s: SerieRealisee) =>
    s.charge >= chargeRef && s.reps >= repsMax && (s.rir === null || s.rir >= exercice.rirCible)
  const toutesReussies = travail.length >= nbSeries && travail.every(reussie)

  const details: Prescription['details'] = {
    chargeReference: chargeRef,
    repsMaxEffectif: repsMax,
    incrementTropGros: tropGros,
    seriesFaites: travail.length,
    seriesPrevues: nbSeries,
  }
  const fourchette = `${exercice.repsMin}–${repsMax}`
  const noteElargie = tropGros
    ? ` Fourchette élargie à ${fourchette}, car ${formatKg(exercice.incrementKg)} dépasse ${Math.round(
        p.seuilIncrementTropGros * 100,
      )} % de ${formatKg(chargeRef)}.`
    : ''

  // Cas 1 : toutes les séries réussies → hausse de charge.
  if (toutesReussies) {
    const hausse = calculerHausse(exercice, chargeRef, p)
    const charge = nettoyer(chargeRef + hausse)
    const series: SerieCible[] = Array.from({ length: nbSeries }, () => ({
      charge,
      reps: exercice.repsMin,
      rirCible: exercice.rirCible,
    }))
    const conditionRir = rirSaisi ? ` (RIR ≥ ${exercice.rirCible})` : ''
    return {
      exerciceId: exercice.id,
      regle: tropGros ? 'R1_HAUSSE_FOURCHETTE_ELARGIE' : 'R1_HAUSSE',
      series,
      explication:
        `+${formatKg(hausse)} car tu as atteint ${repsMax} reps sur toutes les séries${conditionRir}. ` +
        `Objectif : ${exercice.repsMin} reps à ${formatKg(charge)}.${noteElargie}`,
      details: { ...details, hausse },
    }
  }

  // Cas 2 : même charge, +1 rep sur la ou les séries les plus faibles.
  const faites = travail.slice(0, nbSeries).map((s) => s.reps)
  const plusFaible = Math.min(...faites)
  const progression = plusFaible < repsMax
  const series: SerieCible[] = Array.from({ length: nbSeries }, (_, i) => {
    const reps = faites[i]
    let cible: number
    // Série non faite la dernière fois : vise au moins R_min, ou la plus faible des séries faites.
    if (reps === undefined) cible = Math.max(exercice.repsMin, plusFaible)
    else if (progression && reps === plusFaible) cible = reps + 1
    else cible = reps
    return { charge: chargeRef, reps: Math.min(cible, repsMax), rirCible: exercice.rirCible }
  })

  const morceaux: string[] = [`Même charge (${formatKg(chargeRef)})`]
  if (progression) {
    const numeros = faites.flatMap((r, i) => (r === plusFaible ? [i + 1] : []))
    morceaux.push(
      ` : vise +1 rep sur ${nommerSeries(numeros, faites.length)} (${plusFaible} → ${plusFaible + 1}).`,
    )
  } else if (travail.some((s) => s.rir !== null && s.rir < exercice.rirCible)) {
    morceaux.push(
      ` : tu as atteint ${repsMax} reps, mais avec moins de ${formatReps(exercice.rirCible)} en réserve. ` +
        `Refais ${repsMax} reps en gardant ${formatReps(exercice.rirCible)} en réserve.`,
    )
  } else {
    morceaux.push(` : refais ${repsMax} reps sur chaque série.`)
  }
  if (travail.length < nbSeries) {
    morceaux.push(` Tu as fait ${travail.length} série${travail.length > 1 ? 's' : ''} sur ${nbSeries}.`)
  }
  morceaux.push(` La charge monte quand tu fais ${repsMax} reps sur toutes les séries.${noteElargie}`)

  return {
    exerciceId: exercice.id,
    regle: tropGros ? 'R1_MAINTIEN_FOURCHETTE_ELARGIE' : 'R1_MAINTIEN',
    series,
    explication: morceaux.join(''),
    details,
  }
}
