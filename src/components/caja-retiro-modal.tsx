import { useEffect, useState } from "react";
import { useCreateCajaRetiro, useUpdateCajaRetiro } from "../hooks/useCaja";
import type { CajaRetiro } from "../types/database";

interface Props {
  retiroAEditar?: CajaRetiro | null;
  onClose: () => void;
}

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function CajaRetiroModal({ retiroAEditar, onClose }: Props) {
  const [concepto, setConcepto] = useState(retiroAEditar?.concepto ?? "");
  const [monto, setMonto] = useState(
    retiroAEditar ? String(retiroAEditar.monto) : "",
  );
  const [fecha, setFecha] = useState(
    retiroAEditar?.fecha || getLocalDateString(new Date()),
  );

  const createMutation = useCreateCajaRetiro();
  const updateMutation = useUpdateCajaRetiro();

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex overflow-y-auto z-50">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 m-auto my-auto">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800">
            {retiroAEditar ? "✏️ Editar Retiro" : "💸 Retirar de la Caja"}
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
              className="flex-2 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-base font-black disabled:opacity-50 cursor-pointer shadow-md active:scale-95"
            >
              {isPending ? "Guardando..." : "💾 GUARDAR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
