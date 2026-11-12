/**
 * Types du moteur de règles.
 *
 * Le moteur ne connaît ni l'interface ni le stockage : il reçoit des données
 * simples et renvoie un objectif. Toutes les fonctions sont pures et
 * déterministes (aucune lecture de l'heure ou du stockage).
 */

export type TypeMouvement = 'poly' | 'isolation'
export type Zone = 'haut' | 'bas'
export type TypeSerie = 'normale' | 'amrap' | 'echauffement'

/** Configuration d'un exercice telle que le moteur en a besoin. */
export interface ExerciceMoteur {
  id: string
  nom: string
  type: TypeMouvement
  zone: Zone
  repsMin: number
  repsMax: number
  rirCible: number
  /** Plus petit incrément de charge disponible, en kg. */
  incrementKg: number
}

/** Une série enregistrée. */
export interface SerieRealisee {
  charge: number
  reps: number
  /** Répétitions en réserve. `null` quand l'utilisateur ne l'a pas saisi. */
  rir: number | null
  type: TypeSerie
}

/** Les séries d'un exercice lors d'une séance passée. */
export interface SeanceExercice {
  seanceId: string
  /** Date ISO 8601 de la séance. */
  date: string
  /** Fourchette de répétitions en vigueur lors de cette séance. */
  repsMin: number
  repsMax: number
  series: SerieRealisee[]
}

/** L'objectif d'une série pour la prochaine séance. */
export interface SerieCible {
  /** `null` quand le moteur n'a aucune donnée pour proposer une charge. */
  charge: number | null
  reps: number
  rirCible: number
}

export type CodeRegle =
  | 'R1_HAUSSE'
  | 'R1_MAINTIEN'
  | 'R1_HAUSSE_FOURCHETTE_ELARGIE'
  | 'R1_MAINTIEN_FOURCHETTE_ELARGIE'
  | 'R5_DEPART'
  | 'PREMIERE_SEANCE'

export interface Prescription {
  exerciceId: string
  regle: CodeRegle
  series: SerieCible[]
  /** Phrase courte qui explique la décision à l'utilisateur. */
  explication: string
  /** Valeurs intermédiaires utiles pour l'historique des décisions. */
  details: Record<string, number | string | boolean | null>
}
