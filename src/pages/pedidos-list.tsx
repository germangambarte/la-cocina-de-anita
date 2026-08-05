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

  const getLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const hoyStr = getLocalDateString(new Date());

  const pedidosPendientes = pedidos?.filter((p) => !p.entregado) || [];
  const pedidosEntregados =
    pedidos?.filter((p) => {
      if (!p.entregado) return false;
      const esDeHoy = p.created_at.startsWith(hoyStr);
      const tieneDeuda =
        p.metodo_pago === "pendiente" || (p.es_delivery && !p.delivery_pagado);
      return esDeHoy || tieneDeuda;
    }) || [];
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

  const handleEnviarWhatsapp = () => {
    const pedidosParaWhatsapp =
      pedidos?.filter(
        (p) => p.es_delivery && p.metodo_pago === "pendiente",
      ) || [];

    if (pedidosParaWhatsapp.length === 0) {
      alert("No hay pedidos de delivery pendientes de cobro para enviar.");
      return;
    }

    // Contamos cuántas veces aparece cada cliente
    const nameCounts = pedidosParaWhatsapp.reduce(
      (acc, p) => {
        const name = p.cliente_nombre.trim();
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const detallePedidos = pedidosParaWhatsapp
      .map((p) => {
        const subtotalComida = p.monto_total - p.costo_delivery;
        const nombreCliente = p.cliente_nombre.trim();
        let lineaPedido = `- *${nombreCliente}*: $${subtotalComida.toLocaleString()}`;

        // Si el cliente tiene más de un pedido, agregamos la fecha
        if (nameCounts[nombreCliente] > 1) {
          const fecha = new Date(p.created_at);
          const fechaFormateada = `(${fecha.getDate().toString().padStart(2, "0")}/${(fecha.getMonth() + 1).toString().padStart(2, "0")})`;
          lineaPedido += ` ${fechaFormateada}`;
        }
        return lineaPedido;
      })
      .join("\n");

    const { totalARendir, totalParaDelivery } = pedidosParaWhatsapp.reduce(
      (acc, p) => {
        // Caso 1: El local NO le pagó al delivery.
        // El repartidor cobra el total, se queda con su parte y rinde la diferencia.
        if (!p.delivery_pagado) {
          acc.totalARendir += p.monto_total - p.costo_delivery;
          acc.totalParaDelivery += p.costo_delivery;
        } else {
          // Caso 2: El local YA le pagó al delivery (ej. por adelantado).
          // El repartidor cobra el total al cliente y debe rendir el 100% al local.
          acc.totalARendir += p.monto_total;
        }
        return acc;
      },
      { totalARendir: 0, totalParaDelivery: 0 },
    );

    const mensaje = `José, le paso los pagos pendientes:\n\n${detallePedidos}\n\n--------------------------------\n\n*TOTAL VIANDAS:* $${totalARendir.toLocaleString()}\n*PARA SUYO:* $${totalParaDelivery.toLocaleString()}`;

    const urlWhatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(
      mensaje,
    )}`;
    window.open(urlWhatsapp, "_blank");
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
              onClick={handleEnviarWhatsapp}
              className="bg-green-600 hover:bg-green-700 text-white font-extrabold text-sm px-4 py-2.5 rounded-xl transition shadow-xs cursor-pointer active:scale-95"
            >
              💬 Enviar a Delivery
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
