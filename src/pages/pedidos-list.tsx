import { useMemo, useState } from "react";
import { usePedidos, useUpdatePedido } from "../hooks/usePedidos";
import { PedidoCard } from "../components/pedido-card";
import { PedidoModal } from "../components/pedido-modal";
import { GastoModal } from "../components/gasto-modal";
import { BalanceView } from "../components/balance-view";
import { useAuth } from "../context/auth-context";
import type { Pedido, Gasto } from "../types/database";
import { MenuDelDiaInput } from "../components/menu-del-dia-input";
import { PreciosModal } from "../components/precios-modal";
import { getLocalDateString } from "../lib/date";
import { buildDeliveryWhatsAppMessage } from "../lib/whatsapp";

export function PedidosList() {
  const { data: pedidos, isLoading, isError } = usePedidos();
  const updateMutation = useUpdatePedido();
  const { logout } = useAuth();

  const [showModalPedido, setShowModalPedido] = useState(false);
  const [showPrecios, setShowPrecios] = useState(false);
  const [vista, setVista] = useState<"pedidos" | "balance">("pedidos");
  const [tab, setTab] = useState<"pendientes" | "entregados">("pendientes");
  const [pedidoAEditar, setPedidoAEditar] = useState<Pedido | null>(null);

  // Estados para la edicion de gastos:
  const [gastoAEditar, setGastoAEditar] = useState<Gasto | null>(null);
  const [showModalGasto, setShowModalGasto] = useState(false);

  const handleUpdate = (
    id: string,
    updates: Parameters<typeof updateMutation.mutate>[0]["updates"],
  ) => {
    updateMutation.mutate({ id, updates });
  };

  const hoyStr = getLocalDateString(new Date());

  const [pedidosPendientes, pedidosEntregados] = useMemo(() => {
    const pendientes = (pedidos?.filter((p) => !p.entregado) || []).sort(
      (a, b) => a.hora_entrega.localeCompare(b.hora_entrega)
    );

    const entregados = (
      pedidos?.filter((p) => {
        if (!p.entregado) return false;
        const esDeHoy = p.created_at.startsWith(hoyStr);
        const tieneDeuda =
          p.metodo_pago === "pendiente" || (p.es_delivery && !p.delivery_pagado);
        return esDeHoy || tieneDeuda;
      }) || []
    ).sort((a, b) => {
      const aTieneDeuda =
        a.metodo_pago === "pendiente" || (a.es_delivery && !a.delivery_pagado);
      const bTieneDeuda =
        b.metodo_pago === "pendiente" || (b.es_delivery && !b.delivery_pagado);

      if (aTieneDeuda !== bTieneDeuda) {
        return aTieneDeuda ? -1 : 1;
      }
      return a.hora_entrega.localeCompare(b.hora_entrega);
    });

    return [pendientes, entregados];
  }, [pedidos, hoyStr]);

  const listaMostrar = useMemo(
    () => (tab === "pendientes" ? pedidosPendientes : pedidosEntregados),
    [tab, pedidosPendientes, pedidosEntregados]
  );

  if (isLoading)
    return (
      <div className="p-12 text-center text-slate-500 font-black text-xl">
        🍳 Cargando cocina...
      </div>
    );
  if (isError)
    return (
      <div className="p-12 text-center text-red-500 font-bold text-lg">
        Error al cargar información.
      </div>
    );


  const entregadosConDeuda = pedidosEntregados.filter(
    (p) =>
      p.metodo_pago === "pendiente" || (p.es_delivery && !p.delivery_pagado),
  ).length;

  const totalViandasPendientes = pedidosPendientes.reduce(
    (acc, p) => acc + p.cantidad_regular + p.cantidad_grande,
    0,
  );
  const otrosPedidosPendientes = pedidosPendientes.filter(
    (p) => p.cantidad_regular === 0 && p.cantidad_grande === 0,
  ).length;

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

  const handleEnviarWhatsapp = () => {
    const resultado = buildDeliveryWhatsAppMessage(pedidos || []);

    if (!resultado) {
      alert("No hay pedidos de delivery pendientes de cobro para enviar.");
      return;
    }

    const urlWhatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      resultado.mensaje,
    )}`;
    window.open(urlWhatsapp, "_blank");
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6">
      {/* 1. Encabezado Limpio y Marquesina */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              La Cocina de Anita 🍳
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-1">
              Pendientes:{" "}
              <span className="text-amber-600 font-black">
                {totalViandasPendientes} viandas
              </span>
              {otrosPedidosPendientes > 0 && (
                <span className="text-indigo-600 font-black ml-1">
                  + {otrosPedidosPendientes} por kg
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrecios(true)}
              title="Cambiar precios de las viandas"
              className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-700 font-extrabold text-base cursor-pointer transition active:scale-95"
            >
              💲
            </button>
            <button
              onClick={logout}
              title="Cerrar sesión"
              className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-700 font-extrabold text-base cursor-pointer transition active:scale-95"
            >
              🚪 Salir
            </button>
          </div>
        </div>

        {/* 2. BOTÓN PRINCIPAL GIGANTE: NUEVO PEDIDO */}
        <button
          onClick={() => setShowModalPedido(true)}
          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black text-lg sm:text-xl py-4 px-6 rounded-2xl transition shadow-md cursor-pointer active:scale-98 flex items-center justify-center gap-2"
        >
          <span>➕ NUEVO PEDIDO</span>
        </button>

        {/* 3. Acciones Secundarias Limpias */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => setShowModalGasto(true)}
            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 font-extrabold text-sm py-3 px-3 rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            <span>💸 Cargar Gasto</span>
          </button>

          <button
            onClick={handleEnviarWhatsapp}
            className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold text-sm py-3 px-3 rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
          >
            <span>💬 WhatsApp Delivery</span>
          </button>
        </div>

        {/* 4. Menú del Día Destacado */}
        <div className="border-t border-slate-100 pt-4">
          <MenuDelDiaInput />
        </div>
      </div>

      {/* 5. SELECTOR DE VISTA PRINCIPAL (PEDIDOS VS BALANCE) */}
      <div className="grid grid-cols-2 gap-2 bg-slate-200/80 p-1.5 rounded-2xl">
        <button
          onClick={() => setVista("pedidos")}
          className={`py-3 rounded-xl font-black text-base cursor-pointer transition flex items-center justify-center gap-2 ${
            vista === "pedidos"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-700 hover:text-slate-900"
          }`}
        >
          📋 Pedidos del Día
        </button>
        <button
          onClick={() => setVista("balance")}
          className={`py-3 rounded-xl font-black text-base cursor-pointer transition flex items-center justify-center gap-2 ${
            vista === "balance"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-700 hover:text-slate-900"
          }`}
        >
          📊 Balance y Caja
        </button>
      </div>

      {/* VISTA 1: PEDIDOS */}
      {vista === "pedidos" && (
        <div className="space-y-4">
          {/* Sub-pestanas: Por Entregar vs Entregados */}
          <div className="grid grid-cols-2 gap-2 bg-white p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setTab("pendientes")}
              className={`py-3 rounded-xl font-black text-sm sm:text-base transition cursor-pointer flex items-center justify-center gap-2 ${
                tab === "pendientes"
                  ? "bg-amber-100 text-amber-950 border border-amber-300"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>⏳ Por Entregar</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-amber-600 text-white">
                {pedidosPendientes.length}
              </span>
            </button>

            <button
              onClick={() => setTab("entregados")}
              className={`py-3 rounded-xl font-black text-sm sm:text-base transition cursor-pointer flex items-center justify-center gap-2 ${
                tab === "entregados"
                  ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>✅ Entregados</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-emerald-600 text-white">
                {pedidosEntregados.length}
              </span>
              {entregadosConDeuda > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-black bg-red-600 text-white animate-pulse">
                  !
                </span>
              )}
            </button>
          </div>

          {/* Lista de Pedidos */}
          <div className="grid gap-4">
            {listaMostrar.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-300 text-lg font-bold">
                {tab === "pendientes"
                  ? "¡Excelente Anita! No hay pedidos pendientes 🎉"
                  : "No hay pedidos marcados como entregados todavía"}
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
        </div>
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
      {showPrecios && <PreciosModal onClose={() => setShowPrecios(false)} />}
    </div>
  );
}
