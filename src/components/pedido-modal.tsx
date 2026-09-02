import { useState } from "react";
import { UtensilsCrossed, Drumstick, Pencil, Store, Bike, Check } from "lucide-react";
import { useCreatePedido, useUpdatePedido } from "../hooks/usePedidos";
import type { Pedido } from "../types/database";
import { useMenuDelDia } from "../hooks/useMenuDelDia";
import { useConfiguracion } from "../hooks/useConfiguracion";
import { Modal } from "./ui/modal";
import { CLAVES_CONFIG } from "../lib/constantes";

const COSTO_DELIVERY_DEFAULT = 3000;

interface Props {
  pedidoAEditar?: Pedido | null;
  onClose: () => void;
}

export function PedidoModal({ pedidoAEditar, onClose }: Props) {
  const { menuDelDia } = useMenuDelDia();
  const { getValor } = useConfiguracion();

  const esEdicionVianda =
    pedidoAEditar != null &&
    (pedidoAEditar.cantidad_regular > 0 || pedidoAEditar.cantidad_grande > 0);

  // Pestaña activa: "vianda" | "kilo"
  const [tipoTab, setTipoTab] = useState<"vianda" | "kilo">(
    pedidoAEditar != null && !esEdicionVianda ? "kilo" : "vianda",
  );

  // Datos comunes
  const [cliente, setCliente] = useState(pedidoAEditar?.cliente_nombre ?? "");
  const [hora, setHora] = useState(
    pedidoAEditar?.hora_entrega.slice(0, 5) ?? "12:30",
  );
  const [esDelivery, setEsDelivery] = useState(pedidoAEditar?.es_delivery ?? false);
  const costoDeliveryGuardado = pedidoAEditar?.costo_delivery ?? 0;
  const [costoDelivery, setCostoDelivery] = useState(
    costoDeliveryGuardado > 0
      ? costoDeliveryGuardado
      : COSTO_DELIVERY_DEFAULT,
  );

  // Pestaña 1: Viandas
  const [menuNombre, setMenuNombre] = useState(
    esEdicionVianda
      ? pedidoAEditar?.menu_nombre || "Menú del Día"
      : menuDelDia || "Menú del Día",
  );
  const [cantRegular, setCantRegular] = useState(
    pedidoAEditar?.cantidad_regular ?? 0,
  );

  // Precios por defecto guardados en configuración
  const precioRegularDefault = Number(
    getValor(CLAVES_CONFIG.precioRegular, "4500"),
  );
  const precioGrandeDefault = Number(
    getValor(CLAVES_CONFIG.precioGrande, "7000"),
  );

  // El subtotal guardado sirve como precio inicial para pedidos por kilo.
  const subtotalComidaGuardado =
    pedidoAEditar != null
      ? pedidoAEditar.monto_total - pedidoAEditar.costo_delivery
      : 0;

  const [precioRegular, setPrecioRegular] = useState<number | "">(
    precioRegularDefault,
  );
  const [cantGrande, setCantGrande] = useState(
    pedidoAEditar?.cantidad_grande ?? 0,
  );
  const [precioGrande, setPrecioGrande] = useState<number | "">(
    precioGrandeDefault,
  );

  // Pestaña 2: Milanesas / Por Kilo
  const [nombreProductoKilo, setNombreProductoKilo] = useState(
    pedidoAEditar && !esEdicionVianda
      ? pedidoAEditar.menu_nombre || "Milanesas de Pollo"
      : "Milanesas de Pollo",
  );
  const [precioKilo, setPrecioKilo] = useState<number | "">(
    pedidoAEditar && !esEdicionVianda ? subtotalComidaGuardado : 7000,
  );

  // Opción general: Sobrescribir precio final a mano
  const [usarPrecioManual, setUsarPrecioManual] = useState(false);
  const [precioManualComida, setPrecioManualComida] = useState<number | "">("");

  const createMutation = useCreatePedido();
  const updateMutation = useUpdatePedido();

  // Cálculos automáticos
  const subtotalViandas =
    cantRegular * (Number(precioRegular) || 0) +
    cantGrande * (Number(precioGrande) || 0);

  const subtotalKilos = Number(precioKilo) || 0;

  const subtotalCalculadoTab =
    tipoTab === "vianda" ? subtotalViandas : subtotalKilos;
  const subtotalComidaFinal = usarPrecioManual
    ? Number(precioManualComida) || 0
    : subtotalCalculadoTab;

  const totalGeneral =
    subtotalComidaFinal + (esDelivery ? Number(costoDelivery) : 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!cliente.trim()) {
      alert("Por favor escribí el nombre del cliente.");
      return;
    }

    if (totalGeneral <= 0 && !usarPrecioManual) {
      alert(
        "El pedido debe tener viandas, kilos cargados o un monto mayor a $0.",
      );
      return;
    }

    const esVianda = tipoTab === "vianda";
    const nombreFinal = esVianda
      ? menuNombre.trim() || "Menú del Día"
      : nombreProductoKilo.trim() || "Milanesas de Pollo";
    const regFinal = esVianda ? cantRegular : 0;
    const grandeFinal = esVianda ? cantGrande : 0;

    if (pedidoAEditar) {
      updateMutation.mutate(
        {
          id: pedidoAEditar.id,
          updates: {
            cliente_nombre: cliente,
            menu_nombre: nombreFinal,
            cantidad_regular: regFinal,
            cantidad_grande: grandeFinal,
            hora_entrega: hora,
            es_delivery: esDelivery,
            costo_delivery: esDelivery ? Number(costoDelivery) : 0,
            monto_total: totalGeneral,
          },
        },
        { onSuccess: () => onClose() },
      );
    } else {
      createMutation.mutate(
        {
          cliente_nombre: cliente,
          menu_nombre: nombreFinal,
          cantidad_regular: regFinal,
          cantidad_grande: grandeFinal,
          hora_entrega: hora,
          es_delivery: esDelivery,
          costo_delivery: esDelivery ? Number(costoDelivery) : 0,
          monto_total: totalGeneral,
          metodo_pago: "pendiente",
          delivery_pagado: false,
          listo: false,
          entregado: false,
        },
        { onSuccess: () => onClose() },
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Modal
      title={pedidoAEditar ? "Editar Pedido" : "Nuevo Pedido"}
      onClose={onClose}
    >
      {/* PESTAÑAS PRINCIPALES: VIANDAS vs MILANESAS */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl mb-4">
          <button
            type="button"
            onClick={() => setTipoTab("vianda")}
            className={`py-3 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition ${
              tipoTab === "vianda"
                ? "bg-amber-600 text-white shadow-md scale-[1.02]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <UtensilsCrossed className="w-5 h-5" /> Viandas
          </button>

          <button
            type="button"
            onClick={() => setTipoTab("kilo")}
            className={`py-3 rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 cursor-pointer transition ${
              tipoTab === "kilo"
                ? "bg-amber-600 text-white shadow-md scale-[1.02]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Drumstick className="w-5 h-5" /> Milanesas (x kg)
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre del Cliente */}
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-1">
              Nombre del Cliente
            </label>
            <input
              type="text"
              required
              placeholder="Ej: María López"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              className="w-full border-2 border-slate-300 rounded-xl p-3 text-base font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* ================= PESTAÑA 1: VIANDAS ================= */}
          {tipoTab === "vianda" && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 uppercase mb-1">
                  Plato del Día
                </label>
                <input
                  type="text"
                  required
                  value={menuNombre}
                  onChange={(e) => setMenuNombre(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-bold text-slate-800 bg-amber-50/50"
                />
              </div>

              {/* Selector de Vianda Regular */}
              <div className="bg-sky-50 border-2 border-sky-200 p-3.5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-sky-950 text-base">
                    Vianda Regular
                  </span>
                  <div className="flex items-center gap-1 text-xs font-bold text-sky-900">
                    <span>Precio: $</span>
                    <input
                      type="number"
                      step="any"
                      value={precioRegular}
                      onChange={(e) =>
                        setPrecioRegular(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className="w-20 bg-white border border-sky-300 rounded-lg p-1 text-center font-black text-sky-950"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white rounded-xl p-2 border border-sky-200">
                  <button
                    type="button"
                    onClick={() => setCantRegular(Math.max(0, cantRegular - 1))}
                    className="w-12 h-12 bg-sky-100 hover:bg-sky-200 text-sky-900 rounded-xl text-2xl font-black flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    -
                  </button>
                  <span className="text-3xl font-black text-sky-950">
                    {cantRegular}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCantRegular(cantRegular + 1)}
                    className="w-12 h-12 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-2xl font-black flex items-center justify-center cursor-pointer active:scale-95 shadow-xs"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Selector de Vianda Grande */}
              <div className="bg-orange-50 border-2 border-orange-200 p-3.5 rounded-2xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-orange-950 text-base">
                    Vianda Grande
                  </span>
                  <div className="flex items-center gap-1 text-xs font-bold text-orange-900">
                    <span>Precio: $</span>
                    <input
                      type="number"
                      step="any"
                      value={precioGrande}
                      onChange={(e) =>
                        setPrecioGrande(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className="w-20 bg-white border border-orange-300 rounded-lg p-1 text-center font-black text-orange-950"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between bg-white rounded-xl p-2 border border-orange-200">
                  <button
                    type="button"
                    onClick={() => setCantGrande(Math.max(0, cantGrande - 1))}
                    className="w-12 h-12 bg-orange-100 hover:bg-orange-200 text-orange-900 rounded-xl text-2xl font-black flex items-center justify-center cursor-pointer active:scale-95"
                  >
                    -
                  </button>
                  <span className="text-3xl font-black text-orange-950">
                    {cantGrande}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCantGrande(cantGrande + 1)}
                    className="w-12 h-12 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-2xl font-black flex items-center justify-center cursor-pointer active:scale-95 shadow-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= PESTAÑA 2: MILANESAS POR KILO ================= */}
          {tipoTab === "kilo" && (
            <div className="space-y-4 bg-amber-50/80 border-2 border-amber-200 p-4 rounded-2xl">
              <div>
                <label className="block text-xs font-black text-amber-900 uppercase mb-1">
                  Producto por Kilo
                </label>
                <input
                  type="text"
                  required
                  value={nombreProductoKilo}
                  onChange={(e) => setNombreProductoKilo(e.target.value)}
                  className="w-full bg-white border border-amber-300 rounded-xl p-2.5 text-base font-bold text-amber-950"
                />
              </div>

              {/* Botones rápidos de Kilos para mamá */}
              {/* <div> */}
              {/*   <label className="block text-xs font-black text-amber-900 uppercase mb-1"> */}
              {/*     Cantidad de Kilos */}
              {/*   </label> */}
              {/*   <div className="flex gap-2 mb-2"> */}
              {/*     {[0.5, 1, 1.5, 2].map((k) => ( */}
              {/*       <button */}
              {/*         key={k} */}
              {/*         type="button" */}
              {/*         onClick={() => setCantKilos(k)} */}
              {/*         className={`flex-1 py-2 rounded-xl font-black text-xs border cursor-pointer ${ */}
              {/*           cantKilos === k */}
              {/*             ? "bg-amber-600 text-white border-amber-700 shadow-xs" */}
              {/*             : "bg-white text-amber-950 border-amber-300 hover:bg-amber-100" */}
              {/*         }`} */}
              {/*       > */}
              {/*         {k} kg */}
              {/*       </button> */}
              {/*     ))} */}
              {/*   </div> */}
              {/**/}
              {/*   <input */}
              {/*     type="number" */}
              {/*     step="0.1" */}
              {/*     min="0.1" */}
              {/*     placeholder="Cantidad a mano (ej: 1.25)" */}
              {/*     value={cantKilos} */}
              {/*     onChange={(e) => setCantKilos(e.target.value === "" ? "" : Number(e.target.value))} */}
              {/*     className="w-full bg-white border-2 border-amber-300 rounded-xl p-3 text-center text-xl font-black text-amber-950" */}
              {/*   /> */}
              {/* </div> */}

              {/* Precio por Kilo */}
              <div>
                <label className="block text-xs font-black text-amber-900 uppercase mb-1">
                  Precio ($)
                </label>
                <input
                  type="number"
                  step="any"
                  value={precioKilo}
                  onChange={(e) =>
                    setPrecioKilo(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="w-full bg-white border-2 border-amber-300 rounded-xl p-3 text-center text-xl font-black text-amber-950"
                />
              </div>

              <div className="text-right text-xs font-bold text-amber-900 border-t border-amber-200 pt-2">
                Subtotal Comida:{" "}
                <span className="text-lg font-black text-amber-950">
                  ${subtotalKilos.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* ================= PRECIO PERSONALIZADO OPCIONAL ================= */}
          <div className="border-t border-slate-100 pt-2">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={usarPrecioManual}
                onChange={(e) => setUsarPrecioManual(e.target.checked)}
                className="w-4 h-4 rounded text-amber-600 cursor-pointer"
              />
              <Pencil className="w-4 h-4" /> Poner precio de la comida manualmente
            </label>

            {usarPrecioManual && (
              <div className="mt-2">
                <input
                  type="number"
                  placeholder="Monto total de comida ($)"
                  value={precioManualComida}
                  onChange={(e) =>
                    setPrecioManualComida(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="w-full border-2 border-emerald-400 bg-emerald-50 rounded-xl p-2.5 text-base font-black text-emerald-950"
                />
              </div>
            )}
          </div>

          {/* ================= DELIVERY Y HORA ================= */}
          <div className="border-t border-slate-100 pt-3 space-y-3">
            <div>
              <label className="block text-xs font-black text-slate-600 uppercase mb-1">
                Hora de Entrega
              </label>
              <input
                type="time"
                required
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full border-2 border-slate-300 rounded-xl p-2.5 text-base font-black text-slate-800"
              />
            </div>

            {/* Switch de Delivery Gigante y Claro */}
            <div>
              <label className="block text-xs font-black text-slate-600 uppercase mb-1">
                Forma de Entrega
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEsDelivery(false)}
                  className={`py-3 px-2 rounded-xl font-extrabold text-xs sm:text-sm border-2 cursor-pointer transition flex items-center justify-center gap-2 ${
                    !esDelivery
                      ? "bg-emerald-600 border-emerald-700 text-white shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Store className="w-5 h-5" /> Retira en Local
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEsDelivery(true);
                    if (Number(costoDelivery) <= 0) {
                      setCostoDelivery(COSTO_DELIVERY_DEFAULT);
                    }
                  }}
                  className={`py-3 px-2 rounded-xl font-extrabold text-xs sm:text-sm border-2 cursor-pointer transition flex items-center justify-center gap-2 ${
                    esDelivery
                      ? "bg-blue-600 border-blue-700 text-white shadow-xs"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Bike className="w-5 h-5" /> Con Delivery
                </button>
              </div>
            </div>

            {esDelivery && (
              <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex justify-between items-center">
                <span className="text-xs font-extrabold text-blue-900 uppercase">
                  Costo de Envío ($):
                </span>
                <input
                  type="number"
                  step="any"
                  value={costoDelivery}
                  onChange={(e) => setCostoDelivery(Number(e.target.value))}
                  className="w-28 bg-white border border-blue-300 rounded-lg p-1.5 text-center font-black text-blue-950 text-base"
                />
              </div>
            )}
          </div>

          {/* ================= TOTAL Y BOTÓN GUARDAR ================= */}
          <div className="p-4 bg-emerald-100 border-2 border-emerald-300 rounded-2xl flex justify-between items-center text-emerald-950 font-black">
            <span className="text-base sm:text-lg">TOTAL A COBRAR:</span>
            <span className="text-2xl sm:text-3xl font-black text-emerald-900">
              ${totalGeneral.toLocaleString()}
            </span>
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
              className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-base font-black disabled:opacity-50 cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              {isPending ? "Guardando..." : <><Check className="w-5 h-5" /> GUARDAR PEDIDO</>}
            </button>
          </div>
        </form>
    </Modal>
  );
}
