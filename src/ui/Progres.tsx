import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { courbeE1rm } from '../engine'
import { depot } from '../donnees'
import { dateCourte, dateRelative, ecrireNombre, Entete, NOM_REGLE } from './commun'

/** Lit une couleur du thème (les attributs SVG n'acceptent pas toujours var()). */
function useCouleurs() {
  const lire = () => {
    const s = getComputedStyle(document.documentElement)
    return {
      bleu: s.getPropertyValue('--bleu').trim(),
      trait: s.getPropertyValue('--trait').trim(),
      texte: s.getPropertyValue('--fonte-2').trim(),
      carte: s.getPropertyValue('--carte').trim(),
    }
  }
  const [couleurs, setCouleurs] = useState(lire)
  useEffect(() => {
    const m = window.matchMedia('(prefers-color-scheme: dark)')
    const maj = () => setCouleurs(lire())
    m.addEventListener('change', maj)
    return () => m.removeEventListener('change', maj)
  }, [])
  return couleurs
}

export function Progres() {
  const exercices = useLiveQuery(() => depot.listerExercices())
  const reglages = useLiveQuery(() => depot.reglages())
  const recent = useLiveQuery(() => depot.dernierExerciceFait())
  const [choix, setChoix] = useState('')
  const recentActif = exercices?.some((e) => e.id === recent) ? recent : undefined
  const id = choix || recentActif || exercices?.[0]?.id || ''
  const historique = useLiveQuery(() => (id ? depot.historique(id) : []), [id])
  const decisions = useLiveQuery(() => (id ? depot.decisionsExercice(id) : []), [id])
  const couleurs = useCouleurs()

  if (!exercices || !reglages) return null
  if (exercices.length === 0) {
    return (
      <>
        <Entete titre="Progrès" />
        <p className="vide">Tes courbes apparaîtront ici après tes premières séances.</p>
      </>
    )
  }

  const exercice = exercices.find((e) => e.id === id)
  const points = exercice && historique ? courbeE1rm(historique, exercice.rirCible, reglages.parametres.r5) : []
  const donnees = points.map((p) => ({ ...p, jour: dateCourte(p.date) }))
  const dernier = points[points.length - 1]
  const meilleur = points.reduce((m, p) => Math.max(m, p.e1rm), 0)

  return (
    <>
      <Entete titre="Progrès" />
      <div className="formulaire">
        <label>
          <span className="etiquette">Exercice</span>
          <select value={id} onChange={(e) => setChoix(e.target.value)}>
            {exercices.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nom}
              </option>
            ))}
          </select>
        </label>
      </div>

      <h2>1RM estimé</h2>
      {points.length === 0 ? (
        <p className="discret">
          Aucune séance ne permet encore d’estimer ton 1RM. Le calcul demande des séries de 12 reps + RIR au plus.
        </p>
      ) : (
        <>
          <div className="chiffres">
            <div>
              <strong>{ecrireNombre(Math.round(dernier.e1rmLisse * 10) / 10)} kg</strong>
              <span>Lissé sur {reglages.parametres.r5.seancesLissage} séances</span>
            </div>
            <div>
              <strong>{ecrireNombre(Math.round(meilleur * 10) / 10)} kg</strong>
              <span>Meilleure séance</span>
            </div>
            <div>
              <strong>{points.length}</strong>
              <span>Séances</span>
            </div>
          </div>
          <div className="graphique" role="img" aria-label={`Courbe du 1RM estimé pour ${exercice?.nom}`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={donnees} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={couleurs.trait} vertical={false} />
                <XAxis dataKey="jour" tick={{ fill: couleurs.texte, fontSize: 12 }} stroke={couleurs.trait} />
                <YAxis
                  domain={['dataMin - 5', 'dataMax + 5']}
                  tick={{ fill: couleurs.texte, fontSize: 12 }}
                  stroke={couleurs.trait}
                  width={40}
                  tickFormatter={(v: number) => String(Math.round(v))}
                />
                <Tooltip
                  contentStyle={{ background: couleurs.carte, border: `1px solid ${couleurs.trait}`, borderRadius: 8 }}
                  formatter={(v, nom) => [`${ecrireNombre(Math.round(Number(v) * 10) / 10)} kg`, nom === 'e1rm' ? 'Séance' : 'Lissé']}
                />
                <Line
                  type="monotone"
                  dataKey="e1rm"
                  stroke={couleurs.texte}
                  strokeWidth={0}
                  dot={{ r: 3, fill: couleurs.texte, strokeWidth: 0 }}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="e1rmLisse"
                  stroke={couleurs.bleu}
                  strokeWidth={3}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="discret">Points : chaque séance. Ligne : moyenne des {reglages.parametres.r5.seancesLissage} dernières.</p>
        </>
      )}

      <section className="section">
        <h2>Décisions de l’app</h2>
        {!decisions || decisions.length === 0 ? (
          <p className="discret">L’app note ici chaque objectif proposé au début d’une séance.</p>
        ) : (
          <ul className="liste">
            {decisions.slice(0, 30).map((d) => (
              <li key={d.id} className="decision">
                <span className="quand">
                  {dateRelative(d.date)}, {NOM_REGLE[d.regle].toLowerCase()}
                </span>
                <p>{d.explication}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
