import Dexie, { type EntityTable } from 'dexie'
import type {
  CodeRegle,
  ExerciceMoteur,
  ParametresMoteur,
  Prescription,
  SeanceExercice,
  SerieCible,
  TypeSerie,
} from '../engine'

export type Muscle =
  | 'pectoraux'
  | 'deltoides_ant'
  | 'deltoides_lat'
  | 'deltoides_post'
  | 'triceps'
  | 'dorsaux'
  | 'haut_du_dos'
  | 'trapezes'
  | 'biceps'
  | 'avant_bras'
  | 'lombaires'
  | 'abdos'

export const MUSCLES: { id: Muscle; nom: string }[] = [
  { id: 'pectoraux', nom: 'Pectoraux' },
  { id: 'deltoides_ant', nom: 'Deltoïdes antérieurs' },
  { id: 'deltoides_lat', nom: 'Deltoïdes latéraux' },
  { id: 'deltoides_post', nom: 'Deltoïdes postérieurs' },
  { id: 'triceps', nom: 'Triceps' },
  { id: 'dorsaux', nom: 'Grand dorsal' },
  { id: 'haut_du_dos', nom: 'Haut du dos' },
  { id: 'trapezes', nom: 'Trapèzes' },
  { id: 'biceps', nom: 'Biceps' },
  { id: 'avant_bras', nom: 'Avant-bras' },
  { id: 'lombaires', nom: 'Lombaires' },
  { id: 'abdos', nom: 'Abdominaux' },
]

export interface Exercice extends ExerciceMoteur {
  musclesDirects: Muscle[]
  musclesIndirects: Muscle[]
  /** Noms de variantes proches, proposées en cas de plateau (R7). */
  variantes: string[]
  archive: boolean
  creeLe: string
}

export interface ProgrammeItem {
  exerciceId: string
  nbSeries: number
}

export interface Programme {
  id: string
  nom: string
  items: ProgrammeItem[]
}

/** Copie de la configuration d'un exercice au moment de la séance. */
export interface ExerciceDeSeance {
  exerciceId: string
  nbSeries: number
  repsMin: number
  repsMax: number
  rirCible: number
  decisionId: string
}

export interface Seance {
  id: string
  programmeId: string
  debut: string
  fin: string | null
  statut: 'en_cours' | 'terminee'
  exercices: ExerciceDeSeance[]
  decharge: boolean
}

export interface Serie {
  id: string
  seanceId: string
  exerciceId: string
  ordre: number
  charge: number
  reps: number
  rir: number | null
  type: TypeSerie
  faiteLe: string
}

/** Historique des décisions : ce que le moteur a reçu et ce qu'il a proposé. */
export interface Decision {
  id: string
  date: string
  seanceId: string
  exerciceId: string
  regle: CodeRegle
  entrees: {
    exercice: ExerciceMoteur
    nbSeries: number
    historique: SeanceExercice[]
  }
  sortie: SerieCible[]
  explication: string
  details: Prescription['details']
  versionMoteur: number
}

export type Niveau = 'debutant' | 'intermediaire' | 'avance'
export type Objectif = 'hypertrophie' | 'force'

export interface Reglages {
  id: 'reglages'
  niveau: Niveau
  objectif: Objectif
  parametres: ParametresMoteur
  /** Programmes déjà importés, pour ne pas les recharger au démarrage. */
  imports?: string[]
}

export class BaseMuscu extends Dexie {
  exercices!: EntityTable<Exercice, 'id'>
  programmes!: EntityTable<Programme, 'id'>
  seances!: EntityTable<Seance, 'id'>
  series!: EntityTable<Serie, 'id'>
  decisions!: EntityTable<Decision, 'id'>
  reglages!: EntityTable<Reglages, 'id'>

  constructor(nom = 'muscu') {
    super(nom)
    this.version(1).stores({
      exercices: 'id, nom',
      programmes: 'id',
      seances: 'id, programmeId, debut, statut',
      series: 'id, seanceId, exerciceId, faiteLe',
      decisions: 'id, exerciceId, seanceId, date',
      reglages: 'id',
    })
  }
}
