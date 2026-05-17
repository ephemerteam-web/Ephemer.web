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
      className="w-full border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A84E]/50 bg-[#0B1120] text-white"
    >
      <option value="" disabled className="bg-[#0B1120] text-white">
        -- Sélectionner --
      </option>

      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          className="bg-[#0B1120] text-white"
        >
          {option.label}
        </option>
      ))}
    </select>
  )
}
