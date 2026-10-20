import type { ReactNode } from 'react'

export function Card({ title, children, className = '' }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl bg-white shadow-card ring-1 ring-paper-dark ${className}`}>
      {title && <h2 className="border-b border-paper-dark px-4 py-3 text-base font-semibold text-forest-800">{title}</h2>}
      <div className="p-4">{children}</div>
    </section>
  )
}

interface ChampProps {
  label: string
  value: string
  onChange: (v: string) => void
  erreur?: string
  suffixe?: string
  placeholder?: string
  aide?: string
  /** Libellé masqué visuellement (colonne de tableau). */
  labelMasque?: boolean
  id: string
}

export function Champ({ label, value, onChange, erreur, suffixe, placeholder, aide, labelMasque, id }: ChampProps) {
  return (
    <div>
      <label htmlFor={id} className={labelMasque ? 'mb-1 block text-xs text-muted md:sr-only' : 'mb-1 block text-sm font-medium text-carbon'}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          aria-invalid={erreur ? true : undefined}
          aria-describedby={erreur ? `${id}-err` : undefined}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full rounded-lg border bg-white px-3 py-2 text-base text-carbon placeholder:text-muted/60 focus:outline-none focus:ring-2 ${
            suffixe ? 'pr-12' : ''
          } ${erreur ? 'border-red-600 focus:ring-red-300' : 'border-paper-dark focus:border-energy focus:ring-energy-400/40'}`}
        />
        {suffixe && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted">{suffixe}</span>}
      </div>
      {aide && !erreur && <p className="mt-1 text-xs text-muted">{aide}</p>}
      {erreur && (
        <p id={`${id}-err`} className="mt-1 text-xs text-red-700">
          {erreur}
        </p>
      )}
    </div>
  )
}
