import { describe, expect, it } from 'vitest'
import { PARAMETRES_PAR_DEFAUT } from './parametres'
import { appliquerR1, calculerHausse, incrementTropGros } from './r1-double-progression'
import { exercice, s, seance } from './test-utils'

const p = PARAMETRES_PAR_DEFAUT.r1
const devCouche = exercice()

describe('R1 – hausse de charge', () => {
  it('ajoute 2,5 kg quand toutes les séries atteignent R_max avec le RIR cible', () => {
    const r = appliquerR1(devCouche, seance('2026-11-01', [s(80, 10, 2), s(80, 10, 2), s(80, 10, 3)]), 3, p)
    expect(r.regle).toBe('R1_HAUSSE')
    expect(r.series).toEqual([
      { charge: 82.5, reps: 8, rirCible: 2 },
      { charge: 82.5, reps: 8, rirCible: 2 },
      { charge: 82.5, reps: 8, rirCible: 2 },
    ])
    expect(r.explication).toBe(
      '+2,5 kg car tu as atteint 10 reps sur toutes les séries (RIR ≥ 2). Objectif : 8 reps à 82,5 kg.',
    )
  })

  it('monte aussi sans RIR saisi : seules les reps comptent', () => {
    const r = appliquerR1(devCouche, seance('2026-11-01', [s(80, 10), s(80, 10), s(80, 11)]), 3, p)
    expect(r.regle).toBe('R1_HAUSSE')
    expect(r.series[0].charge).toBe(82.5)
    expect(r.explication).not.toContain('RIR')
  })

  it('ignore les séries d’échauffement', () => {
    const r = appliquerR1(
      devCouche,
      seance('2026-11-01', [s(40, 10, null, 'echauffement'), s(80, 10), s(80, 10), s(80, 10)]),
      3,
      p,
    )
    expect(r.regle).toBe('R1_HAUSSE')
    expect(r.series[0].charge).toBe(82.5)
  })
})

describe('R1 – même charge', () => {
  it('ajoute 1 rep sur la série la plus faible', () => {
    const r = appliquerR1(devCouche, seance('2026-11-01', [s(80, 10), s(80, 10), s(80, 9)]), 3, p)
    expect(r.regle).toBe('R1_MAINTIEN')
    expect(r.series.map((x) => [x.charge, x.reps])).toEqual([
      [80, 10],
      [80, 10],
      [80, 10],
    ])
    expect(r.explication).toBe(
      'Même charge (80 kg) : vise +1 rep sur la série 3 (9 → 10). La charge monte quand tu fais 10 reps sur toutes les séries.',
    )
  })

  it('ajoute 1 rep sur toutes les séries à égalité de faiblesse', () => {
    const r = appliquerR1(devCouche, seance('2026-11-01', [s(80, 9), s(80, 8), s(80, 8)]), 3, p)
    expect(r.series.map((x) => x.reps)).toEqual([9, 9, 9])
    expect(r.explication).toContain('sur les séries 2 et 3 (8 → 9)')
  })

  it('ne monte pas quand le RIR est sous la cible, même à R_max', () => {
    const r = appliquerR1(devCouche, seance('2026-11-01', [s(80, 10, 0), s(80, 10, 1), s(80, 10, 0)]), 3, p)
    expect(r.regle).toBe('R1_MAINTIEN')
    expect(r.series.map((x) => [x.charge, x.reps])).toEqual([
      [80, 10],
      [80, 10],
      [80, 10],
    ])
    expect(r.explication).toContain('moins de 2 reps en réserve')
  })

  it('ne monte pas quand une série manque', () => {
    const r = appliquerR1(devCouche, seance('2026-11-01', [s(80, 10), s(80, 10)]), 3, p)
    expect(r.regle).toBe('R1_MAINTIEN')
    expect(r.series.map((x) => x.reps)).toEqual([10, 10, 10])
    expect(r.explication).toContain('Tu as fait 2 séries sur 3.')
  })

  it('vise la charge la plus lourde quand la dernière série a été allégée', () => {
    const r = appliquerR1(devCouche, seance('2026-11-01', [s(80, 10), s(80, 10), s(75, 10)]), 3, p)
    expect(r.regle).toBe('R1_MAINTIEN')
    expect(r.series.every((x) => x.charge === 80)).toBe(true)
  })

  it('progresse sous R_min avec +1 rep', () => {
    const r = appliquerR1(devCouche, seance('2026-11-01', [s(85, 7), s(85, 6), s(85, 6)]), 3, p)
    expect(r.series.map((x) => x.reps)).toEqual([7, 7, 7])
  })
})

describe('R1 – incrément trop gros (haltères, isolation)', () => {
  const elevations = exercice({ id: 'el', nom: 'Élévations latérales', type: 'isolation', repsMin: 10, repsMax: 12, rirCible: 1, incrementKg: 2 })

  it('détecte un incrément supérieur à 10 % de la charge', () => {
    expect(incrementTropGros(elevations, 8, p)).toBe(true)
    expect(incrementTropGros(devCouche, 80, p)).toBe(false)
  })

  it('élargit la fourchette à 10–15 au lieu de monter à 12 reps', () => {
    const r = appliquerR1(elevations, seance('2026-11-01', [s(8, 12), s(8, 12), s(8, 12)], [10, 12]), 3, p)
    expect(r.regle).toBe('R1_MAINTIEN_FOURCHETTE_ELARGIE')
    expect(r.series.map((x) => [x.charge, x.reps])).toEqual([
      [8, 13],
      [8, 13],
      [8, 13],
    ])
    expect(r.explication).toContain('toutes les séries (12 → 13)')
    expect(r.explication).toContain('Fourchette élargie à 10–15, car 2 kg dépasse 10 % de 8 kg.')
  })

  it('monte d’un incrément à 15 reps partout', () => {
    const r = appliquerR1(elevations, seance('2026-11-01', [s(8, 15), s(8, 15), s(8, 15)], [10, 12]), 3, p)
    expect(r.regle).toBe('R1_HAUSSE_FOURCHETTE_ELARGIE')
    expect(r.series[0]).toEqual({ charge: 10, reps: 10, rirCible: 1 })
  })
})

describe('R1 – calcul de la hausse', () => {
  it('borne la hausse entre 2 et 5 % puis l’arrondit à l’incrément', () => {
    expect(calculerHausse(devCouche, 80, p)).toBe(2.5)
    expect(calculerHausse(devCouche, 40, p)).toBe(2.5) // 5 % = 2 kg, mais au moins un incrément
    expect(calculerHausse(devCouche, 150, p)).toBe(2.5) // 2 % = 3 kg, arrondi à 2,5
    expect(calculerHausse(devCouche, 200, p)).toBe(5) // 2 % = 4 kg, arrondi à 5
  })

  it('utilise +5 kg par défaut pour le bas du corps', () => {
    const squat = exercice({ zone: 'bas' })
    expect(calculerHausse(squat, 100, p)).toBe(5)
    expect(calculerHausse(squat, 60, p)).toBe(2.5) // 5 % = 3 kg, arrondi à 2,5
  })

  it('utilise le plus petit incrément pour l’isolation', () => {
    const machine = exercice({ type: 'isolation', incrementKg: 5 })
    expect(calculerHausse(machine, 50, p)).toBe(5)
  })
})
