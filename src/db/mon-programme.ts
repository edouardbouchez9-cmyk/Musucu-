/**
 * Programme Push / Pull repris de Hevy (routines du 12 novembre 2026).
 * Les charges et reps servent de dernière séance : l'app calcule les
 * objectifs suivants à partir d'elles.
 */
import { nouvelId, type Depot } from './depot'
import type { Exercice, Muscle } from './schema'

interface ModeleExercice {
  nom: string
  type: Exercice['type']
  directs: Muscle[]
  indirects: Muscle[]
  fourchette: [number, number]
  rir: number
  increment: number
  /** Séries de la dernière séance : [charge, reps]. */
  series: [number, number][]
}

const x4 = (charge: number, reps: number): [number, number][] => Array.from({ length: 4 }, () => [charge, reps])
const x3 = (charge: number, reps: number): [number, number][] => Array.from({ length: 3 }, () => [charge, reps])

export const MON_PUSH: ModeleExercice[] = [
  {
    nom: 'Chest press convergent (machine)',
    type: 'poly',
    directs: ['pectoraux'],
    indirects: ['deltoides_ant', 'triceps'],
    fourchette: [8, 10],
    rir: 2,
    increment: 2.5,
    series: x4(103.6, 8),
  },
  {
    nom: 'Dips lestés',
    type: 'poly',
    directs: ['triceps', 'pectoraux'],
    indirects: ['deltoides_ant'],
    fourchette: [8, 10],
    rir: 2,
    increment: 1.25,
    series: x4(20, 8),
  },
  {
    nom: 'Développé couché incliné (barre)',
    type: 'poly',
    directs: ['pectoraux'],
    indirects: ['deltoides_ant', 'triceps'],
    fourchette: [8, 10],
    rir: 2,
    increment: 2.5,
    series: x3(81.3, 8),
  },
  {
    nom: 'Développé militaire assis (barre)',
    type: 'poly',
    directs: ['deltoides_ant'],
    indirects: ['triceps', 'deltoides_lat'],
    fourchette: [8, 10],
    rir: 2,
    increment: 2.5,
    series: x3(61.3, 8),
  },
  {
    nom: 'Écartés poulie haute',
    type: 'isolation',
    directs: ['pectoraux'],
    indirects: ['deltoides_ant'],
    fourchette: [8, 12],
    rir: 1,
    increment: 1.25,
    series: [
      [13.5, 12],
      [13.5, 9],
      [13.5, 8],
      [13.5, 8],
    ],
  },
  {
    nom: 'Élévation latérale (poulie)',
    type: 'isolation',
    directs: ['deltoides_lat'],
    indirects: [],
    fourchette: [12, 16],
    rir: 1,
    increment: 1.25,
    series: x3(6.8, 16),
  },
  {
    nom: 'Extension triceps poulie haute',
    type: 'isolation',
    directs: ['triceps'],
    indirects: [],
    fourchette: [8, 12],
    rir: 1,
    increment: 2.5,
    series: x4(33.8, 8),
  },
]

export const MON_PULL: ModeleExercice[] = [
  {
    nom: 'Tractions lestées',
    type: 'poly',
    directs: ['dorsaux'],
    indirects: ['biceps', 'haut_du_dos'],
    fourchette: [8, 10],
    rir: 2,
    increment: 1.25,
    series: x4(20, 8),
  },
  {
    nom: 'Tirage poitrine (poulie)',
    type: 'poly',
    directs: ['dorsaux'],
    indirects: ['biceps', 'haut_du_dos'],
    fourchette: [8, 10],
    rir: 2,
    increment: 2.5,
    series: x4(93, 8),
  },
  {
    nom: 'Tirage bûcheron',
    type: 'poly',
    directs: ['haut_du_dos', 'dorsaux'],
    indirects: ['biceps', 'deltoides_post'],
    fourchette: [8, 10],
    rir: 2,
    increment: 2,
    series: x3(32, 8),
  },
  {
    nom: 'Oiseau (poulie)',
    type: 'isolation',
    directs: ['deltoides_post'],
    indirects: ['haut_du_dos', 'trapezes'],
    fourchette: [8, 12],
    rir: 1,
    increment: 1.25,
    series: x3(9, 8),
  },
  {
    nom: 'Tirage poitrine un bras',
    type: 'poly',
    directs: ['dorsaux'],
    indirects: ['biceps'],
    fourchette: [8, 10],
    rir: 2,
    increment: 2.5,
    series: x3(35.05, 8),
  },
  {
    nom: 'Curl biceps (barre)',
    type: 'isolation',
    directs: ['biceps'],
    indirects: ['avant_bras'],
    fourchette: [6, 10],
    rir: 1,
    increment: 2.5,
    series: [
      [49.7, 8],
      [49.7, 8],
      [49.7, 7],
      [49.7, 6],
    ],
  },
  {
    nom: 'Curl incliné assis (haltères)',
    type: 'isolation',
    directs: ['biceps'],
    indirects: [],
    fourchette: [8, 12],
    rir: 1,
    increment: 2,
    series: x3(22, 7),
  },
]

/** Noms des exercices du programme d'exemple, retirés s'ils n'ont aucun historique. */
const NOMS_EXEMPLE = [
  'Développé couché',
  'Développé incliné haltères',
  'Développé militaire',
  'Élévations latérales',
  'Extension triceps poulie',
  'Tractions lestées',
  'Rowing barre',
  'Tirage vertical',
  'Face pull',
  'Curl biceps haltères',
]

export const CLE_MON_PROGRAMME = 'hevy-2026-11-12'

/**
 * Crée les exercices, remplit Push et Pull, et enregistre une séance passée
 * par programme avec les charges de Hevy. Sans effet sur un exercice qui a
 * déjà un historique. Peut être relancée sans créer de doublons.
 */
export async function chargerMonProgramme(depot: Depot, date = new Date('2026-11-12T12:00:00.000Z')): Promise<void> {
  const tous = await depot.db.exercices.toArray()

  // Retire le programme d'exemple s'il n'a jamais servi.
  for (const e of tous) {
    if (!e.archive && NOMS_EXEMPLE.includes(e.nom) && (await depot.historique(e.id)).length === 0) {
      const memeNomDansMonProgramme = [...MON_PUSH, ...MON_PULL].some((m) => m.nom === e.nom)
      if (!memeNomDansMonProgramme) await depot.archiverExercice(e.id)
    }
  }

  for (const [programmeId, modeles, minutes] of [
    ['push', MON_PUSH, 0],
    ['pull', MON_PULL, 1],
  ] as const) {
    const programme = await depot.programme(programmeId)
    if (!programme) continue
    const actifs = (await depot.db.exercices.toArray()).filter((e) => !e.archive)
    const items: { exerciceId: string; nbSeries: number }[] = []
    const aEnregistrer: { exercice: Exercice; series: [number, number][] }[] = []

    for (const m of modeles) {
      const existant = actifs.find((e) => e.nom === m.nom)
      const sansHistorique = !existant || (await depot.historique(existant.id)).length === 0
      let exercice = existant
      // Un exercice sans historique (par exemple celui de l'exemple) prend la configuration du programme.
      if (!existant || sansHistorique) {
        exercice = {
          id: existant?.id ?? nouvelId(),
          nom: m.nom,
          type: m.type,
          zone: 'haut',
          repsMin: m.fourchette[0],
          repsMax: m.fourchette[1],
          rirCible: m.rir,
          incrementKg: m.increment,
          musclesDirects: m.directs,
          musclesIndirects: m.indirects,
          variantes: [],
          archive: false,
          creeLe: existant?.creeLe ?? date.toISOString(),
        }
        await depot.enregistrerExercice(exercice)
      }
      if (!exercice) continue
      items.push({ exerciceId: exercice.id, nbSeries: m.series.length })
      if (sansHistorique) aEnregistrer.push({ exercice, series: m.series })
    }
    await depot.enregistrerProgramme({ ...programme, items })

    if (aEnregistrer.length > 0) {
      const debut = new Date(date.getTime() + minutes * 60_000).toISOString()
      const seanceId = nouvelId()
      await depot.db.seances.add({
        id: seanceId,
        programmeId,
        debut,
        fin: debut,
        statut: 'terminee',
        decharge: false,
        exercices: aEnregistrer.map(({ exercice, series }) => ({
          exerciceId: exercice.id,
          nbSeries: series.length,
          repsMin: exercice.repsMin,
          repsMax: exercice.repsMax,
          rirCible: exercice.rirCible,
          decisionId: '',
        })),
      })
      for (const { exercice, series } of aEnregistrer) {
        for (const [ordre, [charge, reps]] of series.entries()) {
          await depot.enregistrerSerie({
            seanceId,
            exerciceId: exercice.id,
            ordre,
            charge,
            reps,
            rir: null,
            type: 'normale',
            faiteLe: debut,
          })
        }
      }
    }
  }

  const reglages = await depot.reglages()
  const imports = new Set(reglages.imports ?? [])
  imports.add(CLE_MON_PROGRAMME)
  await depot.enregistrerReglages({ ...reglages, imports: [...imports] })
}

/** Charge le programme au premier lancement, tant qu'aucune séance n'a été faite dans l'app. */
export async function chargerMonProgrammeSiNouveau(depot: Depot): Promise<boolean> {
  const reglages = await depot.reglages()
  if (reglages.imports?.includes(CLE_MON_PROGRAMME)) return false
  const seances = await depot.db.seances.count()
  if (seances > 0) return false
  await chargerMonProgramme(depot)
  return true
}
