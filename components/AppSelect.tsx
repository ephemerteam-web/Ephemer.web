type Option = {
  value: string
  label: string
}

type AppSelectProps = {
  options: Option[]
  value: string
  onChange: (value: string) => void
}

export default function AppSelect({ options, value, onChange }: AppSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full min-h-11 border border-line rounded-xl px-4 py-3 text-sm bg-canvas text-ink"
    >
      <option value="" disabled className="bg-canvas text-ink">
        -- Sélectionner --
      </option>

      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          className="bg-canvas text-ink"
        >
          {option.label}
        </option>
      ))}
    </select>
  )
}
