import { useState } from "react";
import { DollarSign, Check } from "lucide-react";
import { useConfiguracion } from "../hooks/useConfiguracion";
import { MenuDelDiaInput } from "./menu-del-dia-input";
import { CLAVES_CONFIG } from "../lib/constantes";

export function ConfiguracionView() {
  const { getValor, setValor, isUpdating } = useConfiguracion();
  const [regular, setRegular] = useState(
    getValor(CLAVES_CONFIG.precioRegular, "4500"),
  );
  const [grande, setGrande] = useState(
    getValor(CLAVES_CONFIG.precioGrande, "7000"),
  );
  const [guardado, setGuardado] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const r = Number(regular) || 0;
    const g = Number(grande) || 0;

    if (r <= 0 || g <= 0) {
      alert("Por favor ingresá precios mayores a $0.");
      return;
    }

    setValor({ clave: CLAVES_CONFIG.precioRegular, valor: String(r) });
    setValor({ clave: CLAVES_CONFIG.precioGrande, valor: String(g) });
    setGuardado(true);
    window.setTimeout(() => setGuardado(false), 2500);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <MenuDelDiaInput />
      </div>

      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
      <div>
        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-emerald-600" /> Precios de las Viandas
        </h3>
        <p className="text-sm font-bold text-slate-500 leading-relaxed mt-1">
          Estos precios quedan guardados y se usan de forma automática en los
          pedidos nuevos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-black text-slate-600 uppercase mb-1">
            Precio Vianda Regular ($)
          </label>
          <input
            type="number"
            required
            min="1"
            step="any"
            value={regular}
            onChange={(e) => setRegular(e.target.value)}
            className="w-full border-2 border-sky-300 bg-sky-50 rounded-2xl p-3 text-center text-2xl font-black text-sky-950 focus:ring-2 focus:ring-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-black text-slate-600 uppercase mb-1">
            Precio Vianda Grande ($)
          </label>
          <input
            type="number"
            required
            min="1"
            step="any"
            value={grande}
            onChange={(e) => setGrande(e.target.value)}
            className="w-full border-2 border-orange-300 bg-orange-50 rounded-2xl p-3 text-center text-2xl font-black text-orange-950 focus:ring-2 focus:ring-orange-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isUpdating}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-base font-black disabled:opacity-50 cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-2"
        >
          {isUpdating ? "Guardando..." : <><Check className="w-5 h-5" /> GUARDAR PRECIOS</>}
        </button>
      </form>

      {guardado && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-bold text-center flex items-center justify-center gap-2">
          <Check className="w-5 h-5" /> Precios guardados correctamente
        </div>
      )}
      </div>
    </div>
  );
}
