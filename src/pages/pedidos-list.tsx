import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { UtensilsCrossed, Scale, PiggyBank, Settings, Plus, Receipt, LogOut, MessageCircle, Check, PartyPopper, Loader2, Clock, ClipboardPaste } from "lucide-react";
import { usePedidos, useUpdatePedido } from "../hooks/usePedidos";
import { PedidoCard } from "../components/pedido-card";
import { PedidoModal } from "../components/pedido-modal";
import { ImportarPedidoModal } from "../components/importar-pedido-modal";
import { GastoModal } from "../components/gasto-modal";
import { BalanceView } from "../components/balance-view";
import { CajaView } from "../components/caja-view";
import { ConfiguracionView } from "../components/configuracion-view";
import { MenuDelDiaInput } from "../components/menu-del-dia-input";
import { useAuth } from "../context/auth-context";
import type { Pedido, Gasto } from "../types/database";
import { getLocalDateString } from "../lib/date";
import { buildDeliveryWhatsAppMessage } from "../lib/whatsapp";

type Vista = "pedidos" | "balance" | "caja" | "config";

const NAV_ITEMS: { id: Vista; label: string; icon: typeof UtensilsCrossed }[] = [
  { id: "pedidos", label: "Pedidos", icon: UtensilsCrossed },
  { id: "balance", label: "Balance", icon: Scale },
  { id: "caja", label: "Caja", icon: PiggyBank },
  { id: "config", label: "Config", icon: Settings },
];

export function PedidosList() {
  const { data: pedidos, isLoading, isError } = usePedidos();
  const updateMutation = useUpdatePedido();
  const { logout } = useAuth();

  const [showModalPedido, setShowModalPedido] = useState(false);
  const [showModalGasto, setShowModalGasto] = useState(false);
  const [showImportar, setShowImportar] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [vista, setVista] = useState<Vista>("pedidos");
  const [tab, setTab] = useState<"pendientes" | "entregados">("pendientes");
  const [pedidoAEditar, setPedidoAEditar] = useState<Pedido | null>(null);
  const [gastoAEditar, setGastoAEditar] = useState<Gasto | null>(null);

  const [searchParams, setSearchParams] = useSearchParams();

  // Si la app se abrió desde "Compartir" de WhatsApp, el mensaje viene en la URL.
  const textoCompartido = useMemo(
    () =>
      [searchParams.get("text"), searchParams.get("url")]
        .filter(Boolean)
        .join("\n")
        .trim(),
    [searchParams],
  );
  const importarVisible = showImportar || textoCompartido.length > 0;

  const handleUpdate = (
    id: string,
    updates: Parameters<typeof updateMutation.mutate>[0]["updates"],
  ) => {
    updateMutation.mutate({ id, updates });
  };

  const hoyStr = getLocalDateString(new Date());

  const [pedidosPendientes, pedidosEntregados] = useMemo(() => {
    const pendientes = (pedidos?.filter((p) => !p.entregado) || []).sort(
      (a, b) => {
        if (a.listo !== b.listo) return a.listo ? 1 : -1;
        return a.hora_entrega.localeCompare(b.hora_entrega);
      },
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
      <div className="p-12 text-center text-slate-500 font-black text-xl flex items-center justify-center gap-2">
        <Loader2 className="w-6 h-6 animate-spin" /> Cargando cocina...
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

  const totalRegularesPendientes = pedidosPendientes.reduce(
    (acc, p) => acc + p.cantidad_regular,
    0,
  );
  const totalGrandesPendientes = pedidosPendientes.reduce(
    (acc, p) => acc + p.cantidad_grande,
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

  const handleNuevoPedido = () => {
    setShowFabMenu(false);
    setShowModalPedido(true);
  };

  const handleCargarGasto = () => {
    setShowFabMenu(false);
    setShowModalGasto(true);
  };

  const handleImportarMensaje = () => {
    setShowFabMenu(false);
    setShowImportar(true);
  };

  const handleCerrarImportar = () => {
    setShowImportar(false);
    if (textoCompartido) {
      setSearchParams({}, { replace: true });
    }
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
    <div className="max-w-lg mx-auto px-4 pt-4 pb-32 space-y-6">
      {/* Encabezado */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-5">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">
              La Cocina de Anita
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span>Pendientes:</span>
              <span className="text-sky-600 font-black">
                {totalRegularesPendientes} regulares
              </span>
              <span className="text-orange-600 font-black">
                {totalGrandesPendientes} grandes
              </span>
              {otrosPedidosPendientes > 0 && (
                <span className="text-indigo-600 font-black">
                  + {otrosPedidosPendientes} por kg
                </span>
              )}
            </p>
          </div>

          <button
            onClick={logout}
            title="Cerrar sesión"
            className="p-3 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-700 font-extrabold text-base cursor-pointer transition active:scale-95 flex items-center gap-1.5"
          >
            <LogOut className="w-5 h-5" /> Salir
          </button>
        </div>

        <MenuDelDiaInput />

        <button
          onClick={handleEnviarWhatsapp}
          className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-extrabold text-base py-3.5 px-4 rounded-2xl transition cursor-pointer flex items-center justify-center gap-2 active:scale-95"
        >
          <MessageCircle className="w-5 h-5" />
          WhatsApp Delivery
        </button>
      </div>

      {/* VISTA: PEDIDOS */}
      {vista === "pedidos" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 bg-white p-1.5 rounded-2xl border border-slate-200">
            <button
              onClick={() => setTab("pendientes")}
              className={`py-3 rounded-xl font-black text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
                tab === "pendientes"
                  ? "bg-amber-100 text-amber-950 border border-amber-300"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2"><Clock className="w-5 h-5" /> Por Entregar</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-black bg-amber-600 text-white">
                {pedidosPendientes.length}
              </span>
            </button>

            <button
              onClick={() => setTab("entregados")}
              className={`py-3 rounded-xl font-black text-sm transition cursor-pointer flex items-center justify-center gap-2 ${
                tab === "entregados"
                  ? "bg-emerald-100 text-emerald-950 border border-emerald-300"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center gap-2"><Check className="w-5 h-5" /> Entregados</span>
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

          <div className="grid gap-4">
            {listaMostrar.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-300 text-lg font-bold">
                {tab === "pendientes" ? (
                  <div className="flex flex-col items-center gap-2">
                    <PartyPopper className="w-10 h-10" />
                    ¡Excelente Anita! No hay pedidos pendientes
                  </div>
                ) : (
                  "No hay pedidos marcados como entregados todavía"
                )}
              </div>
            ) : (
              listaMostrar.map((pedido) => (
                <PedidoCard
                  key={pedido.id}
                  pedido={pedido}
                  isUpdating={updateMutation.isPending}
                  onUpdate={(id, updates) => handleUpdate(id, updates)}
                  onEdit={(p) => handleAbrirEditar(p)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* VISTA: BALANCE */}
      {vista === "balance" && (
        <BalanceView
          pedidos={pedidos || []}
          onEditGasto={(gasto) => handleAbrirEditarGasto(gasto)}
        />
      )}

      {/* VISTA: CAJA */}
      {vista === "caja" && <CajaView pedidos={pedidos || []} />}

      {/* VISTA: CONFIG */}
      {vista === "config" && <ConfiguracionView />}

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
      {importarVisible && (
        <ImportarPedidoModal
          textoInicial={showImportar ? "" : textoCompartido}
          onClose={handleCerrarImportar}
        />
      )}

      {/* Botón flotante (+) y barra de navegación */}
      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="max-w-lg mx-auto relative">
          <div className="absolute bottom-16 right-4 flex flex-col items-end gap-3">
            {showFabMenu && (
              <div className="flex flex-col items-stretch gap-2 w-56">
                <button
                  onClick={handleImportarMensaje}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-teal-600 text-white font-black text-sm shadow-lg active:scale-95 cursor-pointer"
                >
                  <ClipboardPaste className="w-5 h-5" /> Importar de WhatsApp
                </button>
                <button
                  onClick={handleNuevoPedido}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-600 text-white font-black text-sm shadow-lg active:scale-95 cursor-pointer"
                >
                  <Plus className="w-5 h-5" /> Agregar Pedido
                </button>
                <button
                  onClick={handleCargarGasto}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-600 text-white font-black text-sm shadow-lg active:scale-95 cursor-pointer"
                >
                  <Receipt className="w-5 h-5" /> Cargar Gasto
                </button>
              </div>
            )}

            <button
              onClick={() => setShowFabMenu((v) => !v)}
              title="Acciones"
              className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl flex items-center justify-center cursor-pointer active:scale-95 transition"
            >
              <Plus
                className={`w-7 h-7 transition-transform duration-300 ${
                  showFabMenu ? "rotate-45" : ""
                }`}
              />
            </button>
          </div>
        </div>

        <nav className="bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-lg mx-auto grid grid-cols-4">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const activo = vista === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setVista(item.id)}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-black cursor-pointer transition ${
                    activo
                      ? "text-amber-600"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Icon className={`w-6 h-6 ${activo ? "fill-amber-100" : ""}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
