import { useState } from "react";
import { useSetCajaConfig } from "../hooks/useCaja";
import { Modal } from "./ui/modal";
import { getHoyString } from "../lib/date";
import type { CajaConfig } from "../types/database";

interface Props {
  config?: CajaConfig | null;
  onClose: () => void;
}

export function CajaConfigModal({ config, onClose }: Props) {
  const [fechaInicio, setFechaInicio] = useState(
    config?.fecha_inicio || getHoyString(),
  );
  const [saldoInicial, setSaldoInicial] = useState(
    config ? String(config.saldo_inicial) : "0",
  );

  const setConfigMutation = useSetCajaConfig();

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
    <Modal title="⚙️ Configurar la Caja" onClose={onClose}>
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
    </Modal>
  );
}
