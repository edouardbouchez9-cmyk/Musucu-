import type { Depot } from './depot'
import { nouvelId } from './depot'
import type { Exercice, Muscle } from './schema'

type Modele = [nom: string, type: Exercice['type'], directs: Muscle[], indirects: Muscle[], fourchette: [number, number], rir: number, increment: number, series: number]

const PUSH: Modele[] = [
  ['Développé couché', 'poly', ['pectoraux'], ['deltoides_ant', 'triceps'], [6, 10], 2, 2.5, 3],
  ['Développé incliné haltères', 'poly', ['pectoraux'], ['deltoides_ant', 'triceps'], [8, 12], 2, 2, 3],
  ['Développé militaire', 'poly', ['deltoides_ant'], ['triceps', 'deltoides_lat'], [6, 10], 2, 2.5, 3],
  ['Élévations latérales', 'isolation', ['deltoides_lat'], [], [10, 12], 1, 2, 3],
  ['Extension triceps poulie', 'isolation', ['triceps'], [], [10, 15], 1, 2.5, 3],
]

const PULL: Modele[] = [
  ['Tractions lestées', 'poly', ['dorsaux'], ['biceps', 'haut_du_dos'], [6, 10], 2, 2.5, 3],
  ['Rowing barre', 'poly', ['haut_du_dos', 'dorsaux'], ['biceps', 'deltoides_post', 'lombaires'], [6, 10], 2, 2.5, 3],
  ['Tirage vertical', 'poly', ['dorsaux'], ['biceps'], [8, 12], 2, 2.5, 3],
  ['Face pull', 'isolation', ['deltoides_post'], ['trapezes'], [12, 15], 1, 2.5, 3],
  ['Curl biceps haltères', 'isolation', ['biceps'], ['avant_bras'], [8, 12], 1, 2, 3],
]

/** Crée un programme Push / Pull d'exemple, modifiable ensuite. */
export async function creerExemple(depot: Depot): Promise<void> {
  const creeLe = new Date().toISOString()
  for (const [programmeId, modeles] of [
    ['push', PUSH],
    ['pull', PULL],
  ] as const) {
    const programme = await depot.programme(programmeId)
    if (!programme) continue
    const items = [...programme.items]
    for (const [nom, type, directs, indirects, [repsMin, repsMax], rirCible, incrementKg, nbSeries] of modeles) {
      const exercice: Exercice = {
        id: nouvelId(),
        nom,
        type,
        zone: 'haut',
        repsMin,
        repsMax,
        rirCible,
        incrementKg,
        musclesDirects: directs,
        musclesIndirects: indirects,
        variantes: [],
        archive: false,
        creeLe,
      }
      await depot.enregistrerExercice(exercice)
      items.push({ exerciceId: exercice.id, nbSeries })
    }
    await depot.enregistrerProgramme({ ...programme, items })
  }
}
