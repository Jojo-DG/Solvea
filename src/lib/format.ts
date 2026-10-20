const nf = (max: number, min = 0) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: max, minimumFractionDigits: min })
const f0 = nf(0)
const f1 = nf(1)
const f2 = nf(2)

export const entier = (n: number): string => f0.format(n)
export const decimal1 = (n: number): string => f1.format(n)
export const decimal2 = (n: number): string => f2.format(n)
export const fcfa = (n: number): string => `${f0.format(Math.round(n))} FCFA`
