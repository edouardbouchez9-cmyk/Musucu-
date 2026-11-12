import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { Depot } from './depot'
import { creerExemple } from './exemple'
import { chargerMonProgramme, chargerMonProgrammeSiNouveau } from './mon-programme'
import { BaseMuscu } from './schema'

let depot: Depot

beforeEach(async () => {
  depot = new Depot(new BaseMuscu(`test-${crypto.randomUUID()}`), () => new Date('2026-11-13T18:00:00.000Z'))
  await depot.initialiser()
})

const objectif = async (programmeId: string, nom: string) => {
  const objectifs = await depot.objectifsProgramme(programmeId)
  const o = objectifs.find((x) => x.exercice.nom === nom)
  if (!o) throw new Error(`${nom} absent de ${programmeId}`)
  return o.prescription
}

describe('Mon programme Hevy', () => {
  it('remplit Push et Pull dans l’ordre de Hevy', async () => {
    await chargerMonProgramme(depot)
    const noms = async (id: string) => {
      const p = await depot.programme(id)
      return Promise.all(p!.items.map(async (i) => (await depot.exercice(i.exerciceId))!.nom))
    }
    expect(await noms('push')).toEqual([
      'Chest press convergent (machine)',
      'Dips lestés',
      'Développé couché incliné (barre)',
      'Développé militaire assis (barre)',
      'Écartés poulie haute',
      'Élévation latérale (poulie)',
      'Extension triceps poulie haute',
    ])
    expect(await noms('pull')).toEqual([
      'Tractions lestées',
      'Tirage poitrine (poulie)',
      'Tirage bûcheron',
      'Oiseau (poulie)',
      'Tirage poitrine un bras',
      'Curl biceps (barre)',
      'Curl incliné assis (haltères)',
    ])
  })

  it('calcule les premiers objectifs à partir des charges de Hevy', async () => {
    await chargerMonProgramme(depot)

    const chest = await objectif('push', 'Chest press convergent (machine)')
    expect(chest.regle).toBe('R1_MAINTIEN')
    expect(chest.series.map((s) => [s.charge, s.reps])).toEqual([
      [103.6, 9],
      [103.6, 9],
      [103.6, 9],
      [103.6, 9],
    ])

    const ecartes = await objectif('push', 'Écartés poulie haute')
    expect(ecartes.series.map((s) => s.reps)).toEqual([12, 9, 9, 9])

    const elevation = await objectif('push', 'Élévation latérale (poulie)')
    expect(elevation.regle).toBe('R1_MAINTIEN_FOURCHETTE_ELARGIE')
    expect(elevation.series.map((s) => s.reps)).toEqual([17, 17, 17])

    const curl = await objectif('pull', 'Curl biceps (barre)')
    expect(curl.series.map((s) => s.reps)).toEqual([8, 8, 7, 7])
  })

  it('ne crée aucun doublon quand on le relance', async () => {
    await chargerMonProgramme(depot)
    await chargerMonProgramme(depot)
    expect(await depot.listerExercices()).toHaveLength(14)
    expect(await depot.db.seances.count()).toBe(2)
    expect(await depot.db.series.count()).toBe(49)
  })

  it('remplace le programme d’exemple encore inutilisé', async () => {
    await creerExemple(depot)
    await chargerMonProgramme(depot)
    const noms = (await depot.listerExercices()).map((e) => e.nom)
    expect(noms).toHaveLength(14)
    expect(noms).not.toContain('Rowing barre')
    const tractions = (await depot.listerExercices()).find((e) => e.nom === 'Tractions lestées')!
    expect(tractions.incrementKg).toBe(1.25)
    expect(tractions.repsMin).toBe(8)
  })

  it('se charge une seule fois au démarrage', async () => {
    expect(await chargerMonProgrammeSiNouveau(depot)).toBe(true)
    expect(await chargerMonProgrammeSiNouveau(depot)).toBe(false)
  })

  it('ne se charge pas tout seul si des séances existent déjà', async () => {
    await creerExemple(depot)
    const seance = await depot.demarrerSeance('push')
    await depot.enregistrerSerie({ seanceId: seance.id, exerciceId: seance.exercices[0].exerciceId, ordre: 0, charge: 60, reps: 8, rir: null, type: 'normale' })
    await depot.terminerSeance(seance.id)
    expect(await chargerMonProgrammeSiNouveau(depot)).toBe(false)
  })
})
