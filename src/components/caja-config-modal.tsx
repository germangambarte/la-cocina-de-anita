import { useEffect, useState } from "react";
import { useSetCajaConfig } from "../hooks/useCaja";
import type { CajaConfig } from "../types/database";

interface Props {
  config?: CajaConfig | null;
  onClose: () => void;
}

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function CajaConfigModal({ config, onClose }: Props) {
  const [fechaInicio, setFechaInicio] = useState(
    config?.fecha_inicio || getLocalDateString(new Date()),
  );
  const [saldoInicial, setSaldoInicial] = useState(
    config ? String(config.saldo_inicial) : "0",
  );

  const setConfigMutation = useSetCajaConfig();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fechaInicio) {
      alert("Elegí desde qué día arranca la caja.");
      return;
    }

    setConfigMutation.mutate(
      {
        id: config?.id,
        config: {
          fecha_inicio: fechaInicio,
          saldo_inicial: saldoInicial === "" ? 0 : Number(saldoInicial),
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex overflow-y-auto z-50">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 m-auto my-auto">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800">
            ⚙️ Configurar la Caja
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold text-lg flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm font-bold text-slate-500 leading-relaxed">
            La caja suma sola la ganancia (ventas cobradas - gastos de insumos)
            desde la fecha que elijas. Acá solo ponés desde cuándo arranca y con
            cuánto dinero contás el primer día.
          </p>

          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-1">
              La caja arranca desde el día
            </label>
            <input
              type="date"
              required
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full border-2 border-slate-300 rounded-xl p-2.5 text-base font-black text-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-1">
              Dinero con el que arranca la caja ($)
            </label>
            <input
              type="number"
              min="0"
              placeholder="Ej: 0"
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
              className="w-full border-2 border-emerald-300 bg-emerald-50 rounded-2xl p-3 text-center text-2xl font-black text-emerald-950 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
              disabled={setConfigMutation.isPending}
              className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-base font-black disabled:opacity-50 cursor-pointer shadow-md active:scale-95"
            >
              {setConfigMutation.isPending ? "Guardando..." : "✅ INICIAR CAJA"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
