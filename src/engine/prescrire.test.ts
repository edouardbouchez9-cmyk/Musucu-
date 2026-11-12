import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { completerParametres, PARAMETRES_PAR_DEFAUT } from './parametres'
import { prescrire } from './prescrire'
import { repsMaxEffectif } from './r1-double-progression'
import { exercice, s, seance } from './test-utils'
import type { SeanceExercice } from './types'

const params = PARAMETRES_PAR_DEFAUT

describe('prescrire – choix de la règle', () => {
  it('demande une charge de départ sans historique', () => {
    const r = prescrire(exercice(), [], 3, params)
    expect(r.regle).toBe('PREMIERE_SEANCE')
    expect(r.series).toEqual([
      { charge: null, reps: 8, rirCible: 2 },
      { charge: null, reps: 8, rirCible: 2 },
      { charge: null, reps: 8, rirCible: 2 },
    ])
    expect(r.explication).toBe(
      'Première séance : choisis une charge que tu peux soulever 8–10 fois en gardant 2 reps en réserve.',
    )
  })

  it('applique R1 sur la séance la plus récente de même fourchette', () => {
    const historique = [
      seance('2026-11-01', [s(77.5, 10), s(77.5, 10), s(77.5, 10)]),
      seance('2026-11-04', [s(80, 10), s(80, 10), s(80, 9)]),
    ]
    const r = prescrire(exercice(), historique, 3, params)
    expect(r.regle).toBe('R1_MAINTIEN')
    expect(r.series[0].charge).toBe(80)
    expect(r.details.seanceSource).toBe('seance-2026-11-04')
    expect(r.details.e1rmLisse).not.toBeNull()
  })

  it('ignore une séance qui ne contient que de l’échauffement', () => {
    const historique = [
      seance('2026-11-01', [s(80, 10), s(80, 10), s(80, 10)]),
      seance('2026-11-04', [s(40, 10, null, 'echauffement')]),
    ]
    expect(prescrire(exercice(), historique, 3, params).regle).toBe('R1_HAUSSE')
  })

  it('utilise R5 quand la fourchette a changé', () => {
    // Ancienne fourchette 8–10 ; e1RM de chaque séance = 112 (80 × 10 @ RIR 2).
    const historique = [
      seance('2026-11-01', [s(80, 10, 2)]),
      seance('2026-11-04', [s(80, 10, 2)]),
    ]
    const r = prescrire(exercice({ repsMin: 5, repsMax: 7 }), historique, 3, params)
    expect(r.regle).toBe('R5_DEPART')
    // 112 / (1 + (5 + 2) / 30) = 90,81 → 90 kg
    expect(r.series).toEqual([
      { charge: 90, reps: 5, rirCible: 2 },
      { charge: 90, reps: 5, rirCible: 2 },
      { charge: 90, reps: 5, rirCible: 2 },
    ])
    expect(r.explication).toBe(
      'Nouvelle fourchette (5–7) : 90 kg calculés depuis ton 1RM estimé (112 kg) pour 5 reps avec 2 reps en réserve.',
    )
  })

  it('laisse choisir la charge quand R5 ne peut pas estimer le 1RM', () => {
    const historique = [seance('2026-11-01', [s(50, 15, 1)], [12, 15])]
    const r = prescrire(exercice(), historique, 3, params)
    expect(r.regle).toBe('R5_DEPART')
    expect(r.series[0].charge).toBeNull()
  })

  it('respecte des seuils personnalisés', () => {
    const doux = completerParametres({ r1: { incrementDefautPolyHaut: 1.25, incrementPctMin: 0.01 } })
    const historique = [seance('2026-11-01', [s(80, 10), s(80, 10), s(80, 10)])]
    const r = prescrire(exercice({ incrementKg: 1.25 }), historique, 3, doux)
    expect(r.series[0].charge).toBe(81.25)
  })
})

describe('prescrire – propriétés', () => {
  const arbExercice = fc.record({
    repsMin: fc.integer({ min: 3, max: 12 }),
    largeur: fc.integer({ min: 0, max: 6 }),
    rirCible: fc.integer({ min: 0, max: 4 }),
    incrementKg: fc.constantFrom(1, 1.25, 2, 2.5, 5),
    type: fc.constantFrom('poly' as const, 'isolation' as const),
  })
  const arbSeries = fc.array(
    fc.record({
      charge: fc.integer({ min: 1, max: 120 }).map((x) => x * 2.5),
      reps: fc.integer({ min: 1, max: 20 }),
      rir: fc.option(fc.integer({ min: 0, max: 5 }), { nil: null }),
    }),
    { minLength: 1, maxLength: 6 },
  )

  it('renvoie le bon nombre de séries, des reps valides et une charge cohérente', () => {
    fc.assert(
      fc.property(arbExercice, arbSeries, fc.integer({ min: 1, max: 6 }), (e, series, nbSeries) => {
        const ex = exercice({ ...e, repsMax: e.repsMin + e.largeur })
        const hist: SeanceExercice[] = [
          seance('2026-11-01', series.map((x) => s(x.charge, x.reps, x.rir)), [ex.repsMin, ex.repsMax]),
        ]
        const r = prescrire(ex, hist, nbSeries, params)
        const chargeRef = Math.max(...series.map((x) => x.charge))
        const plafond = repsMaxEffectif(ex, chargeRef, params.r1)

        expect(r.series).toHaveLength(nbSeries)
        for (const cible of r.series) {
          expect(cible.reps).toBeGreaterThanOrEqual(1)
          expect(cible.reps).toBeLessThanOrEqual(plafond)
          if (r.regle.startsWith('R1_HAUSSE')) expect(cible.charge).toBeGreaterThan(chargeRef)
          if (r.regle.startsWith('R1_MAINTIEN')) expect(cible.charge).toBe(chargeRef)
        }
        expect(r.explication.length).toBeGreaterThan(0)
      }),
    )
  })
})
