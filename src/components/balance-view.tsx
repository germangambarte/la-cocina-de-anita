import { useState } from "react";
import { Wallet, Calendar, Pencil, Trash2, Circle } from "lucide-react";
import { useDeleteGasto, useGastos } from "../hooks/useGastos";
import { getLocalDateString, formatFechaLegible } from "../lib/date";
import type { Pedido, Gasto } from "../types/database";

interface Props {
  pedidos: Pedido[];
  onEditGasto: (gasto: Gasto) => void;
}

type Periodo = "dia" | "semana" | "mes";

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
    const fechaLimpia = fechaStr.split("T")[0];

    if (periodo === "dia") return fechaLimpia === hoyStr;

    if (periodo === "semana") {
      const limiteSemana = new Date();
      limiteSemana.setDate(limiteSemana.getDate() - 7);
      return fechaLimpia >= getLocalDateString(limiteSemana);
    }

    if (periodo === "mes") {
      const [yearGasto, monthGasto] = fechaLimpia.split("-");
      const ahora = new Date();
      return (
        yearGasto === String(ahora.getFullYear()) &&
        monthGasto === String(ahora.getMonth() + 1).padStart(2, "0")
      );
    }

    return true;
  };

  const pedidosFiltrados = pedidos.filter(
    (p) => p.metodo_pago !== "pendiente" && esDelPeriodo(p.created_at),
  );

  const gastosFiltrados = gastos.filter((g) => esDelPeriodo(g.fecha));

  // --- CÁLCULOS SEPARADOS ---
  // 1. Total bruto recaudado (incluye viandas + delivery)
  const recaudacionBrutaTotal = pedidosFiltrados.reduce(
    (acc, p) => acc + p.monto_total,
    0,
  );

  // 2. Total asignado al cadete por envíos
  const totalFletesDelivery = pedidosFiltrados.reduce(
    (acc, p) => acc + (p.es_delivery ? p.costo_delivery : 0),
    0,
  );

  // 3. Ventas NETAS del local (lo que realmente corresponde a la Cocina)
  const ventasNetasLocal = recaudacionBrutaTotal - totalFletesDelivery;

  // 4. Egresos e Insumos
  const egresosTotales = gastosFiltrados.reduce((acc, g) => acc + g.monto, 0);

  // 5. Ganancia Neta Real de la Cocina
  const gananciaNetaCocina = ventasNetasLocal - egresosTotales;

  // 6. Viandas vendidas (regulares y grandes)
  const totalViandasRegulares = pedidosFiltrados.reduce(
    (acc, p) => acc + p.cantidad_regular,
    0,
  );
  const totalViandasGrandes = pedidosFiltrados.reduce(
    (acc, p) => acc + p.cantidad_grande,
    0,
  );

  // --- HISTORIAL POR DÍA (días anteriores) ---
  const diasMap = new Map<
    string,
    { menus: Set<string>; ventas: number; gastos: number }
  >();

  for (const p of pedidos) {
    if (p.metodo_pago === "pendiente") continue;
    const fecha = p.created_at.split("T")[0];
    const entry =
      diasMap.get(fecha) ?? {
        menus: new Set<string>(),
        ventas: 0,
        gastos: 0,
      };
    entry.ventas += p.monto_total - (p.es_delivery ? p.costo_delivery : 0);
    entry.menus.add(p.menu_nombre?.trim() || "Menú del Día");
    diasMap.set(fecha, entry);
  }

  for (const g of gastos) {
    const entry =
      diasMap.get(g.fecha) ?? {
        menus: new Set<string>(),
        ventas: 0,
        gastos: 0,
      };
    entry.gastos += g.monto;
    diasMap.set(g.fecha, entry);
  }

  const diasHistorial = [...diasMap.entries()]
    .map(([fecha, d]) => ({
      fecha,
      menus: [...d.menus],
      gastos: d.gastos,
      ganancia: d.ventas - d.gastos,
    }))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 30);

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
      {/* Ganancia Neta: tarjeta grande */}
      <div
        className={`border p-5 rounded-3xl ${
          gananciaNetaCocina >= 0
            ? "bg-slate-900 border-slate-900 text-white"
            : "bg-red-950 border-red-900 text-red-100"
        }`}
      >
        <span className="text-xs font-bold text-slate-400 uppercase block mb-1 flex items-center gap-1">
          <Wallet className="w-4 h-4" /> Ganancia Neta Local
        </span>
        <span className="text-3xl font-black">
          ${gananciaNetaCocina.toLocaleString()}
        </span>
        <span className="text-xs font-semibold text-slate-400 block mt-1">
          {gananciaNetaCocina >= 0
            ? "Resultado positivo local"
            : "Déficit en el período"}
        </span>
      </div>

      {/* Ventas y Gastos: dos tarjetas pequeñas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
          <span className="text-xs font-bold text-emerald-800 uppercase block mb-1 flex items-center gap-1">
            <Circle className="w-3 h-3 fill-emerald-500 text-emerald-500" /> Ventas Netas
          </span>
          <span className="text-xl font-black text-emerald-900">
            ${ventasNetasLocal.toLocaleString()}
          </span>
          <span className="text-[11px] font-semibold text-emerald-700 block mt-1">
            {totalViandasRegulares > 0 || totalViandasGrandes > 0 ? (
              <>
                {totalViandasRegulares > 0 &&
                  `${totalViandasRegulares} regular${
                    totalViandasRegulares !== 1 ? "es" : ""
                  }`}
                {totalViandasRegulares > 0 && totalViandasGrandes > 0 && " · "}
                {totalViandasGrandes > 0 &&
                  `${totalViandasGrandes} grande${
                    totalViandasGrandes !== 1 ? "s" : ""
                  }`}
              </>
            ) : (
              `${pedidosFiltrados.length} pedidos cobrados`
            )}
          </span>
        </div>

        <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl">
          <span className="text-xs font-bold text-rose-800 uppercase block mb-1 flex items-center gap-1">
            <Circle className="w-3 h-3 fill-rose-500 text-rose-500" /> Gastos / Insumos
          </span>
          <span className="text-xl font-black text-rose-900">
            ${egresosTotales.toLocaleString()}
          </span>
          <span className="text-[11px] font-semibold text-rose-700 block mt-1">
            {gastosFiltrados.length} compras
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
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onEditGasto(g)}
                      title="Editar gasto"
                      className="w-10 h-10 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 flex items-center justify-center cursor-pointer"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(g.id, g.concepto)}
                      title="Eliminar gasto"
                      className="w-10 h-10 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= HISTORIAL POR DÍA ================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-600" /> Estadísticas por Día
          </h3>
          <p className="text-xs font-bold text-slate-400">
            Menú, gastos y ganancia de cada día (últimos 30 días con datos)
          </p>
        </div>

        {diasHistorial.length === 0 ? (
          <p className="text-sm font-medium text-slate-400 text-center py-6">
            Todavía no hay días con pedidos cobrados o gastos
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {diasHistorial.map((d) => (
              <div
                key={d.fecha}
                className="py-3 flex justify-between items-center gap-3 text-sm"
              >
                <div className="min-w-0">
                  <span className="font-black text-slate-800 block">
                    {formatFechaLegible(d.fecha)}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold block truncate">
                    {d.menus.length > 0 ? (
                      d.menus.slice(0, 2).join(" · ")
                    ) : (
                      <span className="text-slate-400">Sin pedidos</span>
                    )}
                    {d.menus.length > 2 && (
                      <span className="text-slate-400">
                        {" "}
                        +{d.menus.length - 2} más
                      </span>
                    )}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="block text-xs font-bold text-rose-600">
                    Gastos: -${d.gastos.toLocaleString()}
                  </span>
                  <span
                    className={`block font-black text-base ${
                      d.ganancia >= 0 ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    Ganancia: ${d.ganancia.toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
