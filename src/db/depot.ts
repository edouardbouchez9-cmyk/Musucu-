/**
 * Accès aux données. L'interface passe par ce dépôt ; le moteur ne le connaît pas.
 */
import {
  completerParametres,
  prescrire,
  VERSION_MOTEUR,
  type Prescription,
  type SeanceExercice,
} from '../engine'
import {
  BaseMuscu,
  type Decision,
  type Exercice,
  type ExerciceDeSeance,
  type Programme,
  type ProgrammeItem,
  type Reglages,
  type Seance,
  type Serie,
} from './schema'

/** Identifiant unique. `randomUUID` n'existe qu'en HTTPS : repli pour un test en HTTP sur le Wi-Fi local. */
export function nouvelId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const o = crypto.getRandomValues(new Uint8Array(16))
  o[6] = (o[6] & 0x0f) | 0x40
  o[8] = (o[8] & 0x3f) | 0x80
  const h = [...o].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

export const REGLAGES_PAR_DEFAUT: Reglages = {
  id: 'reglages',
  niveau: 'intermediaire',
  objectif: 'hypertrophie',
  parametres: completerParametres(),
}

export interface ObjectifExercice {
  item: ProgrammeItem
  exercice: Exercice
  prescription: Prescription
}

export interface Sauvegarde {
  app: 'muscu'
  format: 1
  exporteLe: string
  exercices: Exercice[]
  programmes: Programme[]
  seances: Seance[]
  series: Serie[]
  decisions: Decision[]
  reglages: Reglages[]
}

/** Nombre de séances passées copiées dans chaque décision. */
const HISTORIQUE_DANS_DECISION = 5

export class Depot {
  readonly db: BaseMuscu
  private readonly maintenant: () => Date

  constructor(db: BaseMuscu, maintenant: () => Date = () => new Date()) {
    this.db = db
    this.maintenant = maintenant
  }

  private horodatage(): string {
    return this.maintenant().toISOString()
  }

  async initialiser(): Promise<void> {
    const { db } = this
    await db.transaction('rw', db.programmes, db.reglages, async () => {
      if (!(await db.programmes.get('push'))) await db.programmes.add({ id: 'push', nom: 'Push', items: [] })
      if (!(await db.programmes.get('pull'))) await db.programmes.add({ id: 'pull', nom: 'Pull', items: [] })
      if (!(await db.reglages.get('reglages'))) await db.reglages.add(REGLAGES_PAR_DEFAUT)
    })
  }

  // ---------- Réglages ----------

  async reglages(): Promise<Reglages> {
    const r = await this.db.reglages.get('reglages')
    if (!r) return REGLAGES_PAR_DEFAUT
    return { ...r, parametres: completerParametres(r.parametres) }
  }

  async enregistrerReglages(r: Reglages): Promise<void> {
    await this.db.reglages.put(r)
  }

  // ---------- Exercices ----------

  async listerExercices(): Promise<Exercice[]> {
    const tous = await this.db.exercices.toArray()
    return tous.filter((e) => !e.archive).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
  }

  async exercice(id: string): Promise<Exercice | undefined> {
    return this.db.exercices.get(id)
  }

  async enregistrerExercice(e: Exercice): Promise<void> {
    await this.db.exercices.put(e)
  }

  /** Archive l'exercice (l'historique reste) et le retire des programmes. */
  async archiverExercice(id: string): Promise<void> {
    const { db } = this
    await db.transaction('rw', db.exercices, db.programmes, async () => {
      await db.exercices.update(id, { archive: true })
      for (const p of await db.programmes.toArray()) {
        if (p.items.some((i) => i.exerciceId === id)) {
          await db.programmes.put({ ...p, items: p.items.filter((i) => i.exerciceId !== id) })
        }
      }
    })
  }

  // ---------- Programmes ----------

  async listerProgrammes(): Promise<Programme[]> {
    const ordre = ['push', 'pull']
    const tous = await this.db.programmes.toArray()
    return tous.sort((a, b) => ordre.indexOf(a.id) - ordre.indexOf(b.id))
  }

  async programme(id: string): Promise<Programme | undefined> {
    return this.db.programmes.get(id)
  }

  async enregistrerProgramme(p: Programme): Promise<void> {
    await this.db.programmes.put(p)
  }

  // ---------- Historique et objectifs ----------

  /** Séances terminées d'un exercice, au format attendu par le moteur. */
  async historique(exerciceId: string): Promise<SeanceExercice[]> {
    const { db } = this
    const series = await db.series.where('exerciceId').equals(exerciceId).toArray()
    const parSeance = new Map<string, Serie[]>()
    for (const s of series) {
      const liste = parSeance.get(s.seanceId) ?? []
      liste.push(s)
      parSeance.set(s.seanceId, liste)
    }
    const seances = await db.seances.bulkGet([...parSeance.keys()])
    const exercice = await db.exercices.get(exerciceId)
    const resultat: SeanceExercice[] = []
    for (const seance of seances) {
      if (!seance || seance.statut !== 'terminee') continue
      const copie = seance.exercices.find((e) => e.exerciceId === exerciceId)
      const liste = (parSeance.get(seance.id) ?? []).sort((a, b) => a.ordre - b.ordre)
      resultat.push({
        seanceId: seance.id,
        date: seance.debut,
        repsMin: copie?.repsMin ?? exercice?.repsMin ?? 0,
        repsMax: copie?.repsMax ?? exercice?.repsMax ?? 0,
        series: liste.map((s) => ({ charge: s.charge, reps: s.reps, rir: s.rir, type: s.type })),
      })
    }
    return resultat.sort((a, b) => b.date.localeCompare(a.date))
  }

  /** Objectifs de la prochaine séance d'un programme, calculés à la volée. */
  async objectifsProgramme(programmeId: string): Promise<ObjectifExercice[]> {
    const programme = await this.programme(programmeId)
    if (!programme) return []
    const { parametres } = await this.reglages()
    const resultat: ObjectifExercice[] = []
    for (const item of programme.items) {
      const exercice = await this.exercice(item.exerciceId)
      if (!exercice || exercice.archive) continue
      const historique = await this.historique(exercice.id)
      resultat.push({ item, exercice, prescription: prescrire(exercice, historique, item.nbSeries, parametres) })
    }
    return resultat
  }

  // ---------- Séances ----------

  async seanceEnCours(): Promise<Seance | undefined> {
    return this.db.seances.where('statut').equals('en_cours').first()
  }

  async seance(id: string): Promise<Seance | undefined> {
    return this.db.seances.get(id)
  }

  /** Dernières séances terminées, de la plus récente à la plus ancienne. */
  async dernieresSeances(limite = 20): Promise<Seance[]> {
    const toutes = await this.db.seances.where('statut').equals('terminee').toArray()
    return toutes.sort((a, b) => b.debut.localeCompare(a.debut)).slice(0, limite)
  }

  /**
   * Démarre une séance : copie la configuration des exercices, calcule les
   * objectifs et les enregistre dans l'historique des décisions.
   */
  async demarrerSeance(programmeId: string): Promise<Seance> {
    const enCours = await this.seanceEnCours()
    if (enCours) return enCours

    const { parametres } = await this.reglages()
    const objectifs = await this.objectifsProgramme(programmeId)
    const seanceId = nouvelId()
    const date = this.horodatage()
    const decisions: Decision[] = []
    const exercices: ExerciceDeSeance[] = []

    for (const { item, exercice, prescription } of objectifs) {
      const historique = (await this.historique(exercice.id)).slice(0, HISTORIQUE_DANS_DECISION)
      const decision: Decision = {
        id: nouvelId(),
        date,
        seanceId,
        exerciceId: exercice.id,
        regle: prescription.regle,
        entrees: {
          exercice: {
            id: exercice.id,
            nom: exercice.nom,
            type: exercice.type,
            zone: exercice.zone,
            repsMin: exercice.repsMin,
            repsMax: exercice.repsMax,
            rirCible: exercice.rirCible,
            incrementKg: exercice.incrementKg,
          },
          nbSeries: item.nbSeries,
          historique,
        },
        sortie: prescription.series,
        explication: prescription.explication,
        details: { ...prescription.details, versionParametres: parametres.version },
        versionMoteur: VERSION_MOTEUR,
      }
      decisions.push(decision)
      exercices.push({
        exerciceId: exercice.id,
        nbSeries: item.nbSeries,
        repsMin: exercice.repsMin,
        repsMax: exercice.repsMax,
        rirCible: exercice.rirCible,
        decisionId: decision.id,
      })
    }

    const seance: Seance = {
      id: seanceId,
      programmeId,
      debut: date,
      fin: null,
      statut: 'en_cours',
      exercices,
      decharge: false,
    }
    const { db } = this
    await db.transaction('rw', db.seances, db.decisions, async () => {
      await db.seances.add(seance)
      await db.decisions.bulkAdd(decisions)
    })
    return seance
  }

  async decisionsDeSeance(seanceId: string): Promise<Decision[]> {
    return this.db.decisions.where('seanceId').equals(seanceId).toArray()
  }

  async decisionsExercice(exerciceId: string): Promise<Decision[]> {
    const liste = await this.db.decisions.where('exerciceId').equals(exerciceId).toArray()
    return liste.sort((a, b) => b.date.localeCompare(a.date))
  }

  /** Exercice de la dernière série enregistrée, pour ouvrir l'onglet Progrès au bon endroit. */
  async dernierExerciceFait(): Promise<string | undefined> {
    return (await this.db.series.orderBy('faiteLe').last())?.exerciceId
  }

  async seriesDeSeance(seanceId: string): Promise<Serie[]> {
    const liste = await this.db.series.where('seanceId').equals(seanceId).toArray()
    return liste.sort((a, b) => a.ordre - b.ordre)
  }

  async enregistrerSerie(
    serie: Omit<Serie, 'id' | 'faiteLe'> & { id?: string; faiteLe?: string },
  ): Promise<Serie> {
    const complete: Serie = { ...serie, id: serie.id ?? nouvelId(), faiteLe: serie.faiteLe ?? this.horodatage() }
    await this.db.series.put(complete)
    return complete
  }

  async supprimerSerie(id: string): Promise<void> {
    await this.db.series.delete(id)
  }

  /** Termine la séance. Une séance sans aucune série est supprimée. */
  async terminerSeance(seanceId: string): Promise<'terminee' | 'supprimee'> {
    const nb = await this.db.series.where('seanceId').equals(seanceId).count()
    if (nb === 0) {
      await this.annulerSeance(seanceId)
      return 'supprimee'
    }
    await this.db.seances.update(seanceId, { statut: 'terminee', fin: this.horodatage() })
    return 'terminee'
  }

  async annulerSeance(seanceId: string): Promise<void> {
    const { db } = this
    await db.transaction('rw', db.seances, db.series, db.decisions, async () => {
      await db.series.where('seanceId').equals(seanceId).delete()
      await db.decisions.where('seanceId').equals(seanceId).delete()
      await db.seances.delete(seanceId)
    })
  }

  // ---------- Sauvegarde ----------

  async exporter(): Promise<Sauvegarde> {
    const { db } = this
    return {
      app: 'muscu',
      format: 1,
      exporteLe: this.horodatage(),
      exercices: await db.exercices.toArray(),
      programmes: await db.programmes.toArray(),
      seances: await db.seances.toArray(),
      series: await db.series.toArray(),
      decisions: await db.decisions.toArray(),
      reglages: await db.reglages.toArray(),
    }
  }

  /** Remplace toutes les données par celles de la sauvegarde. */
  async importer(s: Sauvegarde): Promise<void> {
    if (s.app !== 'muscu' || s.format !== 1) throw new Error('Ce fichier n’est pas une sauvegarde de cette app.')
    const { db } = this
    await db.transaction('rw', [db.exercices, db.programmes, db.seances, db.series, db.decisions, db.reglages], async () => {
      await Promise.all([
        db.exercices.clear(),
        db.programmes.clear(),
        db.seances.clear(),
        db.series.clear(),
        db.decisions.clear(),
        db.reglages.clear(),
      ])
      await db.exercices.bulkPut(s.exercices)
      await db.programmes.bulkPut(s.programmes)
      await db.seances.bulkPut(s.seances)
      await db.series.bulkPut(s.series)
      await db.decisions.bulkPut(s.decisions)
      await db.reglages.bulkPut(s.reglages)
    })
    await this.initialiser()
  }
}
