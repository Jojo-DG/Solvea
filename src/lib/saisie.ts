/** Lecture des champs de formulaire (texte) vers des nombres, avec virgule décimale française. */

/** Champ obligatoire : vide ou illisible -> NaN (signalé par la validation). */
export function lireNombre(texte: string): number {
  const t = texte.trim().replace(/\s/g, '').replace(',', '.')
  if (t === '') return NaN
  return Number(t)
}

/** Champ facultatif : vide -> null ; illisible -> NaN (signalé par la validation). */
export function lireNombreOptionnel(texte: string): number | null {
  return texte.trim() === '' ? null : lireNombre(texte)
}
