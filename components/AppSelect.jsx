export default function AppSelect({ options, value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-3 py-2 rounded-lg bg-white/5 text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
  );
}
