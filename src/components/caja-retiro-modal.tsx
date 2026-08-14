import { useState } from "react";
import { Save } from "lucide-react";
import { useCreateCajaRetiro, useUpdateCajaRetiro } from "../hooks/useCaja";
import { Modal } from "./ui/modal";
import { getHoyString } from "../lib/date";
import type { CajaRetiro } from "../types/database";

interface Props {
  retiroAEditar?: CajaRetiro | null;
  onClose: () => void;
}

export function CajaRetiroModal({ retiroAEditar, onClose }: Props) {
  const [concepto, setConcepto] = useState(retiroAEditar?.concepto ?? "");
  const [monto, setMonto] = useState(
    retiroAEditar ? String(retiroAEditar.monto) : "",
  );
  const [fecha, setFecha] = useState(retiroAEditar?.fecha || getHoyString());

  const createMutation = useCreateCajaRetiro();
  const updateMutation = useUpdateCajaRetiro();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!concepto.trim()) {
      alert("Por favor escribí para qué sacaste el dinero.");
      return;
    }
    if (!monto || Number(monto) <= 0) {
      alert("Por favor ingresá un monto mayor a $0.");
      return;
    }

    if (retiroAEditar) {
      updateMutation.mutate(
        {
          id: retiroAEditar.id,
          updates: {
            concepto: concepto.trim(),
            monto: Number(monto),
            fecha,
          },
        },
        { onSuccess: onClose },
      );
    } else {
      createMutation.mutate(
        {
          concepto: concepto.trim(),
          monto: Number(monto),
          fecha,
        },
        { onSuccess: onClose },
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={retiroAEditar ? "Editar Retiro" : "Retirar de la Caja"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-1">
              ¿Para qué sacaste el dinero?
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Regalo, pago de luz, compras..."
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full border-2 border-slate-300 rounded-xl p-3 text-base font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-1">
              Monto Retirado ($)
            </label>
            <input
              type="number"
              required
              min="1"
              placeholder="Ej: 5000"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full border-2 border-amber-300 bg-amber-50 rounded-2xl p-3 text-center text-2xl font-black text-amber-950 focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-1">
              Fecha
            </label>
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full border-2 border-slate-300 rounded-xl p-2.5 text-base font-black text-slate-800"
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
              disabled={isPending}
              className="flex-2 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-base font-black disabled:opacity-50 cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              {isPending ? "Guardando..." : <><Save className="w-5 h-5" /> GUARDAR</>}
            </button>
          </div>
        </form>
    </Modal>
  );
}
