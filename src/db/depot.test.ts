import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { Depot } from './depot'
import { BaseMuscu, type Exercice } from './schema'

let horloge: Date
let depot: Depot

const devCouche: Exercice = {
  id: 'dc',
  nom: 'Développé couché',
  type: 'poly',
  zone: 'haut',
  repsMin: 8,
  repsMax: 10,
  rirCible: 2,
  incrementKg: 2.5,
  musclesDirects: ['pectoraux'],
  musclesIndirects: ['triceps', 'deltoides_ant'],
  variantes: [],
  archive: false,
  creeLe: '2026-11-01T00:00:00.000Z',
}

async function faireSeance(series: [number, number, number | null][]) {
  const seance = await depot.demarrerSeance('push')
  for (const [i, [charge, reps, rir]] of series.entries()) {
    await depot.enregistrerSerie({ seanceId: seance.id, exerciceId: 'dc', ordre: i, charge, reps, rir, type: 'normale' })
  }
  await depot.terminerSeance(seance.id)
  return seance
}

beforeEach(async () => {
  horloge = new Date('2026-11-01T18:00:00.000Z')
  depot = new Depot(new BaseMuscu(`test-${crypto.randomUUID()}`), () => horloge)
  await depot.initialiser()
  await depot.enregistrerExercice(devCouche)
  const push = await depot.programme('push')
  await depot.enregistrerProgramme({ ...push!, items: [{ exerciceId: 'dc', nbSeries: 3 }] })
})

describe('Dépôt – parcours d’une séance', () => {
  it('crée Push, Pull et les réglages par défaut', async () => {
    expect((await depot.listerProgrammes()).map((p) => p.nom)).toEqual(['Push', 'Pull'])
    expect((await depot.reglages()).parametres.r1.incrementDefautPolyHaut).toBe(2.5)
  })

  it('demande une charge de départ à la première séance', async () => {
    const [objectif] = await depot.objectifsProgramme('push')
    expect(objectif.prescription.regle).toBe('PREMIERE_SEANCE')
  })

  it('enregistre la décision au démarrage et la relie à la séance', async () => {
    const seance = await depot.demarrerSeance('push')
    const decisions = await depot.decisionsDeSeance(seance.id)
    expect(decisions).toHaveLength(1)
    expect(seance.exercices[0].decisionId).toBe(decisions[0].id)
    expect(decisions[0].entrees.exercice.repsMax).toBe(10)
  })

  it('propose +2,5 kg après une séance réussie, puis maintient après un échec', async () => {
    await faireSeance([
      [80, 10, 2],
      [80, 10, 2],
      [80, 10, 2],
    ])
    horloge = new Date('2026-11-04T18:00:00.000Z')
    let [objectif] = await depot.objectifsProgramme('push')
    expect(objectif.prescription.regle).toBe('R1_HAUSSE')
    expect(objectif.prescription.series[0]).toEqual({ charge: 82.5, reps: 8, rirCible: 2 })

    await faireSeance([
      [82.5, 9, 2],
      [82.5, 8, 2],
      [82.5, 7, 1],
    ])
    ;[objectif] = await depot.objectifsProgramme('push')
    expect(objectif.prescription.regle).toBe('R1_MAINTIEN')
    expect(objectif.prescription.series.map((s) => s.reps)).toEqual([9, 8, 8])
  })

  it('ignore une séance en cours dans l’historique', async () => {
    const seance = await depot.demarrerSeance('push')
    await depot.enregistrerSerie({ seanceId: seance.id, exerciceId: 'dc', ordre: 0, charge: 80, reps: 10, rir: 2, type: 'normale' })
    expect(await depot.historique('dc')).toHaveLength(0)
  })

  it('garde la fourchette de la séance passée et bascule sur R5 si elle change', async () => {
    await faireSeance([
      [80, 10, 2],
      [80, 10, 2],
      [80, 10, 2],
    ])
    await depot.enregistrerExercice({ ...devCouche, repsMin: 5, repsMax: 7 })
    const [objectif] = await depot.objectifsProgramme('push')
    expect(objectif.prescription.regle).toBe('R5_DEPART')
    expect(objectif.prescription.series[0].charge).toBe(90)
  })

  it('supprime une séance terminée sans aucune série', async () => {
    const seance = await depot.demarrerSeance('push')
    expect(await depot.terminerSeance(seance.id)).toBe('supprimee')
    expect(await depot.seance(seance.id)).toBeUndefined()
    expect(await depot.decisionsDeSeance(seance.id)).toHaveLength(0)
  })

  it('exporte puis réimporte toutes les données', async () => {
    await faireSeance([[80, 10, 2]])
    const sauvegarde = JSON.parse(JSON.stringify(await depot.exporter()))
    const autre = new Depot(new BaseMuscu(`test-${crypto.randomUUID()}`))
    await autre.importer(sauvegarde)
    expect(await autre.historique('dc')).toEqual(await depot.historique('dc'))
    expect(await autre.decisionsExercice('dc')).toHaveLength(1)
  })
})
