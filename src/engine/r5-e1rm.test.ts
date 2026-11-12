import { describe, expect, it } from 'vitest'
import { PARAMETRES_PAR_DEFAUT } from './parametres'
import { chargePourObjectif, courbeE1rm, e1rmLisse, e1rmSeance, e1rmSerie } from './r5-e1rm'
import { s, seance } from './test-utils'

const p = PARAMETRES_PAR_DEFAUT.r5

describe('R5 – e1RM d’une série', () => {
  it('applique charge × (1 + (reps + RIR) / 30)', () => {
    expect(e1rmSerie(s(100, 5, 2), 2, p)).toBeCloseTo(123.333, 3)
    expect(e1rmSerie(s(80, 10, 2), 2, p)).toBe(112)
  })

  it('refuse le calcul au-delà de 12 reps + RIR', () => {
    expect(e1rmSerie(s(100, 10, 3), 2, p)).toBeNull()
    expect(e1rmSerie(s(60, 15, 0), 2, p)).toBeNull()
    expect(e1rmSerie(s(100, 10, 2), 2, p)).not.toBeNull()
  })

  it('suppose le RIR cible quand le RIR n’est pas saisi', () => {
    expect(e1rmSerie(s(80, 10, null), 2, p)).toBe(112)
  })

  it('ignore l’échauffement', () => {
    expect(e1rmSerie(s(60, 5, 5, 'echauffement'), 2, p)).toBeNull()
  })
})

describe('R5 – e1RM d’une séance et lissage', () => {
  it('garde la meilleure série de la séance', () => {
    expect(e1rmSeance(seance('2026-11-01', [s(80, 10, 2), s(80, 9, 1), s(80, 8, 0)]), 2, p)).toBe(112)
  })

  it('lisse sur les 3 dernières séances, dans l’ordre des dates', () => {
    // e1RM successifs : 112 ; 115 ; 116,67 ; 121 (fournis dans le désordre).
    const historique = [
      seance('2026-11-08', [s(110, 2, 1)]), // 110 × 1,1 = 121
      seance('2026-11-01', [s(80, 10, 2)]), // 112
      seance('2026-11-05', [s(100, 4, 1)]), // 100 × 1,1667 = 116,667
      seance('2026-11-03', [s(100, 3, 1.5)]), // 100 × 1,15 = 115
    ]
    const courbe = courbeE1rm(historique, 2, p)
    expect(courbe.map((x) => x.date)).toEqual(['2026-11-01', '2026-11-03', '2026-11-05', '2026-11-08'])
    expect(courbe[0].e1rmLisse).toBe(112)
    expect(courbe[1].e1rmLisse).toBe(113.5)
    expect(courbe[3].e1rmLisse).toBeCloseTo((115 + 116.667 + 121) / 3, 2)
    expect(e1rmLisse(historique, 2, p)).toBe(courbe[3].e1rmLisse)
  })

  it('saute les séances sans e1RM calculable', () => {
    const historique = [seance('2026-11-01', [s(50, 20, 0)]), seance('2026-11-03', [s(80, 10, 2)])]
    expect(courbeE1rm(historique, 2, p)).toHaveLength(1)
    expect(e1rmLisse([seance('2026-11-01', [s(50, 20, 0)])], 2, p)).toBeNull()
  })
})

describe('R5 – charge prescrite', () => {
  it('inverse la formule puis arrondit à l’incrément inférieur', () => {
    expect(chargePourObjectif(120, 8, 2, 2.5, p)).toBe(90) // 120 / 1,3333 = 90
    expect(chargePourObjectif(117, 8, 2, 2.5, p)).toBe(87.5) // 87,75 → 87,5
    expect(chargePourObjectif(117, 8, 2, 1, p)).toBe(87)
  })
})
