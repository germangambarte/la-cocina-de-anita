import { useState } from "react";
import { useConfiguracion } from "../hooks/useConfiguracion";
import { Modal } from "./ui/modal";
import { CLAVES_CONFIG } from "../lib/constantes";

interface Props {
  onSaved?: (regular: number, grande: number) => void;
  onClose: () => void;
}

export function PreciosModal({ onSaved, onClose }: Props) {
  const { getValor, setValor, isUpdating } = useConfiguracion();
  const [regular, setRegular] = useState(
    getValor(CLAVES_CONFIG.precioRegular, "4500"),
  );
  const [grande, setGrande] = useState(
    getValor(CLAVES_CONFIG.precioGrande, "7000"),
  );

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
    onSaved?.(r, g);
    onClose();
  };

  return (
    <Modal title="💲 Precios de las Viandas" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm font-bold text-slate-500 leading-relaxed">
          Estos precios quedan guardados y se usan de forma automática en los
          pedidos nuevos.
        </p>

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

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border-2 border-slate-300 rounded-xl text-sm font-extrabold text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isUpdating}
            className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-base font-black disabled:opacity-50 cursor-pointer shadow-md active:scale-95"
          >
            {isUpdating ? "Guardando..." : "✅ GUARDAR PRECIOS"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
