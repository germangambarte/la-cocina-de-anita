import { useEffect, useState } from "react";
import { usePedidos, useUpdatePedido } from "../hooks/usePedidos";
import { PedidoCard } from "../components/pedido-card";
import { PedidoModal } from "../components/pedido-modal";
import { GastoModal } from "../components/gasto-modal";
import { BalanceView } from "../components/balance-view";
import { useAuth } from "../context/auth-context";
import type { Pedido, Gasto } from "../types/database";
import { useMenuDelDia } from "../hooks/useMenuDelDia";
import { MenuDelDiaInput } from "../components/menu-del-dia-input";

export function PedidosList() {
  const { data: pedidos, isLoading, isError } = usePedidos();
  const { menuDelDia, actualizarMenu } = useMenuDelDia();
  const [textoMenu, setTextoMenu] = useState(menuDelDia);
  const updateMutation = useUpdatePedido();
  const { logout } = useAuth();

  const [showModalPedido, setShowModalPedido] = useState(false);
  const [vista, setVista] = useState<"pedidos" | "balance">("pedidos");
  const [tab, setTab] = useState<"pendientes" | "entregados">("pendientes");
  const [pedidoAEditar, setPedidoAEditar] = useState<Pedido | null>(null);

  // Estados adicionales para la edicion de gastos:
  const [gastoAEditar, setGastoAEditar] = useState<Gasto | null>(null);
  const [showModalGasto, setShowModalGasto] = useState(false);

  // Sincronizar el input local cuando cambie el menú en la base de datos
  useEffect(() => {
    setTextoMenu(menuDelDia);
  }, [menuDelDia]);

  // Debounce: enviar a Supabase solo tras 600ms de inactividad al tipear
  useEffect(() => {
    // Si el texto local es idéntico al de la DB, no hacemos nada
    if (textoMenu === menuDelDia) return;

    const timer = setTimeout(() => {
      actualizarMenu(textoMenu);
    }, 600);

    return () => clearTimeout(timer);
  }, [textoMenu, menuDelDia, actualizarMenu]);

  const handleUpdate = (
    id: string,
    updates: Parameters<typeof updateMutation.mutate>[0]["updates"],
  ) => {
    updateMutation.mutate({ id, updates });
  };

  if (isLoading)
    return (
      <div className="p-8 text-center text-slate-500 font-bold text-lg">
        Cargando datos...
      </div>
    );
  if (isError)
    return (
      <div className="p-8 text-center text-red-500 font-bold text-lg">
        Error al cargar información.
      </div>
    );

  const pedidosPendientes = pedidos?.filter((p) => !p.entregado) || [];
  const pedidosEntregados = pedidos?.filter((p) => p.entregado) || [];
  const listaMostrar =
    tab === "pendientes" ? pedidosPendientes : pedidosEntregados;
  const entregadosConDeuda = pedidosEntregados.filter(
    (p) =>
      p.metodo_pago === "pendiente" || (p.es_delivery && !p.delivery_pagado),
  ).length;

  const totalViandasPendientes = pedidosPendientes.reduce(
    (acc, p) => acc + p.cantidad_regular + p.cantidad_grande,
    0,
  );

  const handleAbrirEditar = (pedido: Pedido) => {
    setPedidoAEditar(pedido);
    setShowModalPedido(true);
  };

  const handleCerrarModal = () => {
    setPedidoAEditar(null);
    setShowModalPedido(false);
  };

  const handleAbrirEditarGasto = (gasto: Gasto) => {
    setGastoAEditar(gasto);
    setShowModalGasto(true);
  };

  const handleCerrarModalGasto = () => {
    setGastoAEditar(null);
    setShowModalGasto(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-5">
      {/* Encabezado Principal */}
      <div className="bg-white p-5 rounded-2xl shadow-xs border border-slate-200 space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-800">
              Cocina de Anita
            </h1>
            <p className="text-xs font-semibold text-slate-500">
              Viandas pendientes:{" "}
              <span className="text-amber-600 font-black">
                {totalViandasPendientes} unidades
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowModalPedido(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
            >
              ➕ Nuevo Pedido
            </button>
            <button
              onClick={() => setShowModalGasto(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
            >
              💸 Cargar Gasto
            </button>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="p-2.5 border border-slate-300 rounded-xl hover:bg-slate-100 text-slate-600 font-bold text-sm cursor-pointer"
            >
              🚪
            </button>
          </div>
        </div>

        {/* Input Persistente del Menú del Día */}
        <MenuDelDiaInput />
        {/* Selector de Pantallas (Pedidos vs Balance) */}
        <div className="flex gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={() => setVista("pedidos")}
            className={`flex-1 py-2 rounded-xl font-bold text-sm cursor-pointer transition ${
              vista === "pedidos"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            📋 Pedidos del Día
          </button>
          <button
            onClick={() => setVista("balance")}
            className={`flex-1 py-2 rounded-xl font-bold text-sm cursor-pointer transition ${
              vista === "balance"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            📊 Balance y Caja
          </button>
        </div>
      </div>

      {/* VISTA 1: PEDIDOS */}
      {vista === "pedidos" && (
        <>
          <div className="flex gap-2 bg-slate-200/60 p-1.5 rounded-2xl">
            <button
              onClick={() => setTab("pendientes")}
              className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
                tab === "pendientes"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>⏳ Por Entregar</span>
              <span className="text-xs px-2 py-0.5 rounded-full font-black bg-amber-100 text-amber-900">
                {pedidosPendientes.length}
              </span>
            </button>

            <button
              onClick={() => setTab("entregados")}
              className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
                tab === "entregados"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <span>✅ Entregados</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-black bg-emerald-100 text-emerald-900">
                    {pedidosEntregados.length}
                  </span>
                </div>

                {/* Badge de alerta si hay entregados que no pagaron aún */}
                {entregadosConDeuda > 0 && (
                  <span
                    className="text-xs px-2 py-1 rounded-full font-black bg-red-600 text-white animate-pulse"
                    title="Entregados con pagos o cadetería pendiente"
                  >
                    {entregadosConDeuda} por cobrar
                  </span>
                )}
              </div>
            </button>
          </div>

          <div className="grid gap-4">
            {listaMostrar.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-300 text-base font-bold">
                {tab === "pendientes"
                  ? "¡Excelente! No hay pedidos pendientes 🎉"
                  : "Sin pedidos marcados como entregados"}
              </div>
            ) : (
              listaMostrar.map((pedido) => (
                <PedidoCard
                  key={pedido.id}
                  pedido={pedido}
                  onUpdate={(id, updates) => handleUpdate(id, updates)}
                  onEdit={(p) => handleAbrirEditar(p)}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* VISTA 2: BALANCE Y CAJA */}
      {vista === "balance" && (
        <BalanceView
          pedidos={pedidos || []}
          onEditGasto={(gasto) => handleAbrirEditarGasto(gasto)}
        />
      )}

      {/* Modales */}
      {showModalPedido && (
        <PedidoModal
          pedidoAEditar={pedidoAEditar}
          onClose={handleCerrarModal}
        />
      )}
      {showModalGasto && (
        <GastoModal
          gastoAEditar={gastoAEditar}
          onClose={handleCerrarModalGasto}
        />
      )}
    </div>
  );
}
