/**
 * Seuils paramétrables du moteur. Les valeurs par défaut reprennent le cahier
 * des charges. L'interface peut les modifier ; le moteur les reçoit en entrée.
 */
export interface ParametresMoteur {
  version: number
  r1: {
    /** Hausse de charge minimale, en fraction de la charge actuelle (2 %). */
    incrementPctMin: number
    /** Hausse de charge maximale, en fraction de la charge actuelle (5 %). */
    incrementPctMax: number
    /** Hausse par défaut d'un polyarticulaire du haut du corps, en kg. */
    incrementDefautPolyHaut: number
    /** Hausse par défaut d'un exercice du bas du corps, en kg. */
    incrementDefautBas: number
    /**
     * Au-delà de cette fraction de la charge, le plus petit incrément est jugé
     * trop gros : l'exercice progresse en répétitions dans une fourchette élargie.
     */
    seuilIncrementTropGros: number
    /** Répétitions ajoutées en haut de la fourchette élargie (10–12 → 10–15). */
    elargissementFourchette: number
  }
  r5: {
    /** Diviseur de la formule d'Epley. */
    diviseur: number
    /** L'e1RM n'est calculé que si reps + RIR ne dépasse pas cette valeur. */
    repsPlusRirMax: number
    /** Nombre de séances pour lisser l'e1RM. */
    seancesLissage: number
  }
}

export const VERSION_MOTEUR = 1

export const PARAMETRES_PAR_DEFAUT: ParametresMoteur = {
  version: VERSION_MOTEUR,
  r1: {
    incrementPctMin: 0.02,
    incrementPctMax: 0.05,
    incrementDefautPolyHaut: 2.5,
    incrementDefautBas: 5,
    seuilIncrementTropGros: 0.1,
    elargissementFourchette: 3,
  },
  r5: {
    diviseur: 30,
    repsPlusRirMax: 12,
    seancesLissage: 3,
  },
}

/** Fusionne des paramètres partiels (par exemple sauvegardés) avec les valeurs par défaut. */
export function completerParametres(partiel?: {
  r1?: Partial<ParametresMoteur['r1']>
  r5?: Partial<ParametresMoteur['r5']>
}): ParametresMoteur {
  return {
    version: VERSION_MOTEUR,
    r1: { ...PARAMETRES_PAR_DEFAUT.r1, ...partiel?.r1 },
    r5: { ...PARAMETRES_PAR_DEFAUT.r5, ...partiel?.r5 },
  }
}
