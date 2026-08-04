import { useState } from "react";
import { useGastos, useDeleteGasto } from "../hooks/useGastos";
import type { Pedido, Gasto } from "../types/database";

interface Props {
  pedidos: Pedido[];
  onEditGasto: (gasto: Gasto) => void; // 👈 Recibimos la función de edicion
}

type Periodo = "dia" | "semana" | "mes";

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function BalanceView({ pedidos, onEditGasto }: Props) {
  const deleteGasto = useDeleteGasto();
  const { data: gastos = [], isLoading } = useGastos();
  const [periodo, setPeriodo] = useState<Periodo>("dia");

  if (isLoading)
    return (
      <div className="p-4 text-center font-bold text-slate-500">
        Calculando balance...
      </div>
    );

  const hoyStr = getLocalDateString(new Date());

  const esDelPeriodo = (fechaStr: string) => {
    // Si la fecha viene en formato YYYY-MM-DD
    const fechaLimpia = fechaStr.split("T")[0];

    if (periodo === "dia") {
      return fechaLimpia === hoyStr;
    }

    if (periodo === "semana") {
      const limiteSemana = new Date();
      limiteSemana.setDate(limiteSemana.getDate() - 7);
      const limiteStr = getLocalDateString(limiteSemana);
      return fechaLimpia >= limiteStr;
    }

    if (periodo === "mes") {
      const [yearGasto, monthGasto] = fechaLimpia.split("-");
      const ahora = new Date();
      const yearActual = String(ahora.getFullYear());
      const monthActual = String(ahora.getMonth() + 1).padStart(2, "0");

      return yearGasto === yearActual && monthGasto === monthActual;
    }

    return true;
  };
  const pedidosFiltrados = pedidos.filter(
    (p) => p.metodo_pago !== "pendiente" && esDelPeriodo(p.created_at),
  );

  const gastosFiltrados = gastos.filter((g) => esDelPeriodo(g.fecha));

  const ingresosTotales = pedidosFiltrados.reduce(
    (acc, p) => acc + p.monto_total,
    0,
  );
  const egresosTotales = gastosFiltrados.reduce((acc, g) => acc + g.monto, 0);
  const gananciaNeta = ingresosTotales - egresosTotales;

  const handleDelete = (id: string, concepto: string) => {
    if (confirm(`¿Eliminar el gasto "${concepto}"?`)) {
      deleteGasto.mutate(id);
    }
  };

  return (
    <div className="space-y-5">
      {/* Selector de Período */}
      <div className="flex justify-center gap-2 bg-white p-2 rounded-2xl border border-slate-200">
        <button
          onClick={() => setPeriodo("dia")}
          className={`px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition ${
            periodo === "dia"
              ? "bg-amber-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Hoy
        </button>
        <button
          onClick={() => setPeriodo("semana")}
          className={`px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition ${
            periodo === "semana"
              ? "bg-amber-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Últimos 7 Días
        </button>
        <button
          onClick={() => setPeriodo("mes")}
          className={`px-4 py-2 rounded-xl font-bold text-xs cursor-pointer transition ${
            periodo === "mes"
              ? "bg-amber-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Este Mes
        </button>
      </div>

      {/* Tarjetas Principales de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
          <span className="text-xs font-bold text-emerald-800 uppercase block mb-1">
            🟢 Ventas / Ingresos
          </span>
          <span className="text-2xl font-black text-emerald-900">
            ${ingresosTotales.toLocaleString()}
          </span>
          <span className="text-[11px] font-semibold text-emerald-700 block mt-1">
            {pedidosFiltrados.length} pedidos cobrados
          </span>
        </div>

        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl">
          <span className="text-xs font-bold text-rose-800 uppercase block mb-1">
            🔴 Gastos / Compras
          </span>
          <span className="text-2xl font-black text-rose-900">
            ${egresosTotales.toLocaleString()}
          </span>
          <span className="text-[11px] font-semibold text-rose-700 block mt-1">
            {gastosFiltrados.length} compras registradas
          </span>
        </div>

        <div
          className={`border p-4 rounded-2xl ${
            gananciaNeta >= 0
              ? "bg-slate-900 border-slate-900 text-white"
              : "bg-red-950 border-red-900 text-red-100"
          }`}
        >
          <span className="text-xs font-bold text-slate-400 uppercase block mb-1">
            💰 Caja Neta (Ganancia)
          </span>
          <span className="text-2xl font-black">
            ${gananciaNeta.toLocaleString()}
          </span>
          <span className="text-[11px] font-semibold text-slate-400 block mt-1">
            {gananciaNeta >= 0 ? "Resultado positivo" : "Déficit en el período"}
          </span>
        </div>
      </div>

      {/* Historial Reciente de Gastos con Botones de Edición */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
        <h3 className="text-base font-bold text-slate-800">
          Últimas Compras de Insumos
        </h3>

        {gastosFiltrados.length === 0 ? (
          <p className="text-sm font-medium text-slate-400 text-center py-6">
            No hay gastos cargados en este período
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {gastosFiltrados.map((g) => (
              <div
                key={g.id}
                className="py-3 flex justify-between items-center text-sm"
              >
                <div>
                  <span className="font-bold text-slate-800 block">
                    {g.concepto}
                  </span>
                  <span className="text-xs text-slate-400 font-semibold">
                    {g.fecha} • {g.categoria.replace("_", " ")}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-black text-rose-600 text-base">
                    -${g.monto.toLocaleString()}
                  </span>

                  {/* Acciones de Edición/Eliminación */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditGasto(g)}
                      title="Editar gasto"
                      className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(g.id, g.concepto)}
                      title="Eliminar gasto"
                      className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold cursor-pointer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
