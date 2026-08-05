import { useState, useEffect } from "react";
import { useCreatePedido, useUpdatePedido } from "../hooks/usePedidos";
import type { Pedido } from "../types/database";
import { useMenuDelDia } from "../hooks/useMenuDelDia";

const PRECIO_REGULAR = 4500;
const PRECIO_GRANDE = 7000;

interface Props {
  pedidoAEditar?: Pedido | null;
  onClose: () => void;
}

export function PedidoModal({ pedidoAEditar, onClose }: Props) {
  const [cliente, setCliente] = useState("");
  const [menuNombre, setMenuNombre] = useState("");
  const [cantRegular, setCantRegular] = useState(0);
  const [cantGrande, setCantGrande] = useState(0);
  const [hora, setHora] = useState("12:30");
  const [esDelivery, setEsDelivery] = useState(false);
  const [costoDelivery, setCostoDelivery] = useState(3000);
  const { menuDelDia } = useMenuDelDia();

  const createMutation = useCreatePedido();
  const updateMutation = useUpdatePedido();

  // Cargar datos si estamos en modo edición
  useEffect(() => {
    if (pedidoAEditar) {
      setCliente(pedidoAEditar.cliente_nombre);
      setMenuNombre(pedidoAEditar.menu_nombre);
      setCantRegular(pedidoAEditar.cantidad_regular);
      setCantGrande(pedidoAEditar.cantidad_grande);
      setHora(pedidoAEditar.hora_entrega.slice(0, 5));
      setEsDelivery(pedidoAEditar.es_delivery);
      setCostoDelivery(pedidoAEditar.costo_delivery);
    } else {
      const menuGuardado = menuDelDia || "Menú del Día";
      setMenuNombre(menuGuardado);
    }
  }, [pedidoAEditar]);

  const totalViandas =
    cantRegular * PRECIO_REGULAR + cantGrande * PRECIO_GRANDE;
  const totalGeneral = totalViandas + (esDelivery ? Number(costoDelivery) : 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cantRegular === 0 && cantGrande === 0) {
      alert("Debes agregar al menos una vianda.");
      return;
    }

    if (pedidoAEditar) {
      // MODO EDICIÓN
      updateMutation.mutate(
        {
          id: pedidoAEditar.id,
          updates: {
            cliente_nombre: cliente,
            menu_nombre: menuNombre,
            cantidad_regular: cantRegular,
            cantidad_grande: cantGrande,
            hora_entrega: hora,
            es_delivery: esDelivery,
            costo_delivery: esDelivery ? Number(costoDelivery) : 0,
            monto_total: totalGeneral,
          },
        },
        { onSuccess: () => onClose() },
      );
    } else {
      // MODO CREACIÓN
      createMutation.mutate(
        {
          cliente_nombre: cliente,
          menu_nombre: menuNombre.trim() || "Menú del Día",
          cantidad_regular: cantRegular,
          cantidad_grande: cantGrande,
          hora_entrega: hora,
          es_delivery: esDelivery,
          costo_delivery: esDelivery ? Number(costoDelivery) : 0,
          monto_total: totalGeneral,
          metodo_pago: "pendiente",
          delivery_pagado: false,
          entregado: false,
        },
        { onSuccess: () => onClose() },
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <h2 className="text-xl font-extrabold text-slate-800 mb-4">
          {pedidoAEditar ? "✏️ Editar Pedido" : "➕ Cargar Nuevo Pedido"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Cliente
            </label>
            <input
              type="text"
              required
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Plato / Menú
            </label>
            <input
              type="text"
              required
              value={menuNombre}
              onChange={(e) => setMenuNombre(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none bg-amber-50/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-200">
              <label className="block text-xs font-bold text-sky-900 uppercase mb-1">
                Regular ($4.500)
              </label>
              <input
                type="number"
                min="0"
                value={cantRegular}
                onChange={(e) => setCantRegular(Number(e.target.value))}
                className="w-full bg-white border border-sky-300 rounded-lg p-2 text-center text-lg font-black text-sky-900"
              />
            </div>

            <div className="bg-orange-50/60 p-3 rounded-xl border border-orange-200">
              <label className="block text-xs font-bold text-orange-900 uppercase mb-1">
                Grande ($7.000)
              </label>
              <input
                type="number"
                min="0"
                value={cantGrande}
                onChange={(e) => setCantGrande(Number(e.target.value))}
                className="w-full bg-white border border-orange-300 rounded-lg p-2 text-center text-lg font-black text-orange-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Hora límite
              </label>
              <input
                type="time"
                required
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2 text-sm font-bold"
              />
            </div>

            <div className="pt-5">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={esDelivery}
                  onChange={(e) => setEsDelivery(e.target.checked)}
                  className="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                />
                ¿Es Delivery?
              </label>
            </div>
          </div>

          {esDelivery && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Costo del envío ($)
              </label>
              <input
                type="number"
                step="500"
                value={costoDelivery}
                onChange={(e) => setCostoDelivery(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-xl p-2 text-sm font-bold text-blue-700"
              />
            </div>
          )}

          <div className="p-3.5 bg-amber-100/70 rounded-xl flex justify-between items-center text-amber-950 font-black">
            <span>Total a Cobrar:</span>
            <span className="text-xl">${totalGeneral.toLocaleString()}</span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-extrabold hover:bg-amber-700 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isPending
                ? "Guardando..."
                : pedidoAEditar
                  ? "Actualizar"
                  : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
