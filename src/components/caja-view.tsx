import { useState } from "react";
import { Wallet, PiggyBank, Settings, Banknote, Pencil, Trash2, Play } from "lucide-react";
import { useGastos } from "../hooks/useGastos";
import {
  useCajaConfig,
  useCajaRetiros,
  useDeleteCajaRetiro,
} from "../hooks/useCaja";
import { CajaRetiroModal } from "./caja-retiro-modal";
import { CajaConfigModal } from "./caja-config-modal";
import type { Pedido, CajaRetiro } from "../types/database";

interface Props {
  pedidos: Pedido[];
}

export function CajaView({ pedidos }: Props) {
  const { data: gastos = [] } = useGastos();
  const { data: cajaConfig } = useCajaConfig();
  const { data: retiros = [] } = useCajaRetiros();
  const deleteRetiro = useDeleteCajaRetiro();

  const [retiroAEditar, setRetiroAEditar] = useState<CajaRetiro | null>(null);
  const [showModalRetiro, setShowModalRetiro] = useState(false);
  const [showModalConfig, setShowModalConfig] = useState(false);

  const fechaInicio = cajaConfig?.fecha_inicio;
  const saldoInicial = Number(cajaConfig?.saldo_inicial || 0);

  const gananciaAcumulada =
    fechaInicio == null
      ? 0
      : pedidos
          .filter(
            (p) =>
              p.metodo_pago !== "pendiente" &&
              p.created_at.split("T")[0] >= fechaInicio,
          )
          .reduce(
            (acc, p) =>
              acc + (p.monto_total - (p.es_delivery ? p.costo_delivery : 0)),
            0,
          ) -
        gastos
          .filter((g) => g.fecha >= fechaInicio)
          .reduce((acc, g) => acc + g.monto, 0);

  const retirosDesdeInicio = retiros
    .filter((r) => fechaInicio == null || r.fecha >= fechaInicio)
    .reduce((acc, r) => acc + r.monto, 0);

  const disponibleCaja =
    saldoInicial + gananciaAcumulada - retirosDesdeInicio;

  const handleDeleteRetiro = (id: string, concepto: string) => {
    if (confirm(`¿Eliminar el retiro "${concepto}"?`)) {
      deleteRetiro.mutate(id);
    }
  };

  const handleAbrirNuevoRetiro = () => {
    setRetiroAEditar(null);
    setShowModalRetiro(true);
  };

  const handleAbrirEditarRetiro = (retiro: CajaRetiro) => {
    setRetiroAEditar(retiro);
    setShowModalRetiro(true);
  };

  const handleCerrarModalRetiro = () => {
    setRetiroAEditar(null);
    setShowModalRetiro(false);
  };

  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
      {!cajaConfig ? (
        <div className="text-center space-y-3 py-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <PiggyBank className="w-8 h-8" />
            </div>
          </div>
          <h3 className="text-lg font-black text-slate-800">Caja de Ganancia</h3>
          <p className="text-sm font-bold text-slate-500 leading-relaxed">
            Acá vas a poder ver cuánta plata de la ganancia tenés disponible
            para gastar, y registrar cada vez que sacás dinero para uso
            personal.
          </p>
          <button
            onClick={() => setShowModalConfig(true)}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base rounded-2xl cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-2 mx-auto"
          >
            <Play className="w-5 h-5" /> Iniciar la Caja
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-amber-600" /> Caja de Ganancia
            </h3>
            <button
              onClick={() => setShowModalConfig(true)}
              title="Configurar caja"
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-sm font-extrabold cursor-pointer flex items-center gap-1"
            >
              <Settings className="w-4 h-4" /> Configurar
            </button>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-5 text-center">
            <span className="text-xs font-bold text-slate-400 uppercase block mb-1">
              Disponible para Gastar
            </span>
            <span className="text-3xl sm:text-4xl font-black">
              ${disponibleCaja.toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-slate-400 block mt-2">
              Desde {fechaInicio} • Arranque: ${saldoInicial.toLocaleString()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <span className="text-xs font-bold text-emerald-800 uppercase block">
                Ganancia acumulada
              </span>
              <span className="text-lg font-black text-emerald-900">
                +${gananciaAcumulada.toLocaleString()}
              </span>
            </div>
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
              <span className="text-xs font-bold text-rose-800 uppercase block">
                Retirado para gastos
              </span>
              <span className="text-lg font-black text-rose-900">
                -${retirosDesdeInicio.toLocaleString()}
              </span>
            </div>
          </div>

          <button
            onClick={handleAbrirNuevoRetiro}
            className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-base rounded-2xl cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <Banknote className="w-5 h-5" /> Retirar dinero de la caja
          </button>

          <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2">
            {retiros.filter((r) => fechaInicio == null || r.fecha >= fechaInicio)
              .length === 0 ? (
              <p className="text-sm font-medium text-slate-400 text-center py-4">
                Todavía no sacaste dinero de la caja
              </p>
            ) : (
              retiros
                .filter((r) => fechaInicio == null || r.fecha >= fechaInicio)
                .map((r) => (
                  <div
                    key={r.id}
                    className="py-3 flex justify-between items-center text-sm"
                  >
                    <div>
                      <span className="font-bold text-slate-800 block">
                        {r.concepto}
                      </span>
                      <span className="text-xs text-slate-400 font-semibold">
                        {r.fecha}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-black text-amber-700 text-base">
                        -${r.monto.toLocaleString()}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleAbrirEditarRetiro(r)}
                          title="Editar retiro"
                          className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRetiro(r.id, r.concepto)}
                          title="Eliminar retiro"
                          className="w-10 h-10 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 flex items-center justify-center cursor-pointer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      )}

      {showModalRetiro && (
        <CajaRetiroModal
          retiroAEditar={retiroAEditar}
          onClose={handleCerrarModalRetiro}
        />
      )}
      {showModalConfig && (
        <CajaConfigModal
          config={cajaConfig}
          onClose={() => setShowModalConfig(false)}
        />
      )}
    </div>
  );
}
