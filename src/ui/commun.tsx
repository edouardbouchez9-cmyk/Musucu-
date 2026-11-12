import type { ReactNode } from 'react'
import type { CodeRegle, SerieCible } from '../engine'

/** Lit « 82,5 » ou « 82.5 ». Renvoie `null` si la saisie n'est pas un nombre. */
export function lireNombre(texte: string): number | null {
  const t = texte.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** 82.5 → « 82,5 ». */
export function ecrireNombre(n: number | null | undefined): string {
  if (n === null || n === undefined) return ''
  return String(Math.round(n * 1000) / 1000).replace('.', ',')
}

const JOUR = 24 * 60 * 60 * 1000

/** « aujourd'hui », « hier », « il y a 3 jours », « 12 oct. ». */
export function dateRelative(iso: string, maintenant = new Date()): string {
  const d = new Date(iso)
  const debutJour = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const jours = Math.round((debutJour(maintenant) - debutJour(d)) / JOUR)
  if (jours <= 0) return 'aujourd’hui'
  if (jours === 1) return 'hier'
  if (jours < 7) return `il y a ${jours} jours`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export function dateCourte(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export type GenreDecision = 'hausse' | 'maintien' | 'depart'

export function genreDecision(regle: CodeRegle): GenreDecision {
  if (regle.startsWith('R1_HAUSSE')) return 'hausse'
  if (regle.startsWith('R1_MAINTIEN')) return 'maintien'
  return 'depart'
}

export const NOM_REGLE: Record<CodeRegle, string> = {
  R1_HAUSSE: 'Hausse de charge',
  R1_HAUSSE_FOURCHETTE_ELARGIE: 'Hausse de charge (fourchette élargie)',
  R1_MAINTIEN: 'Même charge, +1 rep',
  R1_MAINTIEN_FOURCHETTE_ELARGIE: 'Même charge, +1 rep (fourchette élargie)',
  R5_DEPART: 'Départ calculé sur le 1RM estimé',
  PREMIERE_SEANCE: 'Première séance',
}

/** Résumé compact d'un objectif : « 82,5 kg × 8 » ou « 80 kg × 10, 10, 9 ». */
export function resumeObjectif(series: SerieCible[]): { charge: string; reps: string } {
  if (series.length === 0) return { charge: '', reps: '' }
  const charges = new Set(series.map((s) => s.charge))
  const charge =
    charges.size === 1
      ? series[0].charge === null
        ? 'Charge libre'
        : `${ecrireNombre(series[0].charge)} kg`
      : 'Charges variables'
  const reps = series.map((s) => s.reps)
  const toutesEgales = reps.every((r) => r === reps[0])
  return { charge, reps: toutesEgales ? `${series.length} × ${reps[0]}` : reps.join(', ') }
}

/** Version courte pour l'accueil : « 82,5 kg × 8 » ou « 80 kg × 10, 10, 9 ». */
export function cibleCompacte(series: SerieCible[]): string {
  if (series.length === 0) return ''
  const reps = series.map((s) => s.reps)
  const texteReps = reps.every((r) => r === reps[0]) ? String(reps[0]) : reps.join(', ')
  const c = series[0].charge
  return c === null ? `${texteReps} reps` : `${ecrireNombre(c)} kg × ${texteReps}`
}

export function Segments<T extends string>(props: {
  valeur: T
  options: { valeur: T; texte: string }[]
  onChange: (v: T) => void
  etiquette: string
}) {
  return (
    <div className="segments" role="group" aria-label={props.etiquette}>
      {props.options.map((o) => (
        <button
          type="button"
          key={o.valeur}
          aria-pressed={props.valeur === o.valeur}
          onClick={() => props.onChange(o.valeur)}
        >
          {o.texte}
        </button>
      ))}
    </div>
  )
}

export function Puces<T extends string>(props: {
  selection: T[]
  options: { valeur: T; texte: string }[]
  desactivees?: T[]
  onChange: (v: T[]) => void
  etiquette: string
}) {
  return (
    <div className="puces" role="group" aria-label={props.etiquette}>
      {props.options.map((o) => {
        const actif = props.selection.includes(o.valeur)
        return (
          <button
            type="button"
            key={o.valeur}
            aria-pressed={actif}
            disabled={!actif && props.desactivees?.includes(o.valeur)}
            onClick={() =>
              props.onChange(actif ? props.selection.filter((x) => x !== o.valeur) : [...props.selection, o.valeur])
            }
          >
            {o.texte}
          </button>
        )
      })}
    </div>
  )
}

export function Compteur(props: {
  valeur: number
  min: number
  max: number
  onChange: (v: number) => void
  libelle: (v: number) => string
  etiquette: string
}) {
  return (
    <div className="compteur" role="group" aria-label={props.etiquette}>
      <button
        type="button"
        aria-label="Moins"
        disabled={props.valeur <= props.min}
        onClick={() => props.onChange(props.valeur - 1)}
      >
        −
      </button>
      <span>{props.libelle(props.valeur)}</span>
      <button
        type="button"
        aria-label="Plus"
        disabled={props.valeur >= props.max}
        onClick={() => props.onChange(props.valeur + 1)}
      >
        +
      </button>
    </div>
  )
}

export function Entete(props: { titre: string; children?: ReactNode }) {
  return (
    <header className="entete">
      <h1>{props.titre}</h1>
      {props.children}
    </header>
  )
}
