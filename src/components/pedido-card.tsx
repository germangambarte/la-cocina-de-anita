import { TimeRemainingBadge } from './time-remaining-badge';
import { useDeletePedido } from '../hooks/usePedidos';
import type { Pedido, MetodoPago } from '../types/database';

interface Props {
  pedido: Pedido;
  onUpdate: (id: string, updates: Partial<Pedido>) => void;
  onEdit: (pedido: Pedido) => void;
}

export function PedidoCard({ pedido, onUpdate, onEdit }: Props) {
  const deleteMutation = useDeletePedido();

  // Estados de cobro / delivery
  const faltaCobrarCliente = pedido.metodo_pago === 'pendiente';
  const faltaPagarDelivery = pedido.es_delivery && !pedido.delivery_pagado;
  const tieneDeuda = faltaCobrarCliente || faltaPagarDelivery;

  // Estilos según el estado de la tarjeta
  const getCardStyle = () => {
    if (!pedido.entregado) {
      return 'border-slate-200 bg-white shadow-xs hover:border-amber-400';
    }
    if (tieneDeuda) {
      return 'border-amber-300 bg-amber-50/40';
    }
    return 'border-slate-200 bg-slate-50/90 opacity-80';
  };

  return (
    <div className={`rounded-3xl border-2 p-4 sm:p-5 space-y-3.5 ${getCardStyle()}`}>
      {/* 1. Nombre del cliente, Menú y Botones de Edición */}
      <div className="flex justify-between items-start gap-2 border-b border-slate-100 pb-3">
        <div>
          <span className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight block">
            {pedido.cliente_nombre}
          </span>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="bg-amber-50 text-amber-950 font-extrabold text-xs px-2.5 py-1 rounded-lg border border-amber-200">
              🍲 {pedido.menu_nombre || 'Menú del Día'}
            </span>
            <TimeRemainingBadge horaEntrega={pedido.hora_entrega} entregado={pedido.entregado} />
          </div>
        </div>

        {/* Acciones de Edición/Eliminación */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(pedido)}
            title="Editar pedido"
            className="w-9 h-9 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm flex items-center justify-center cursor-pointer active:scale-95"
          >
            ✏️
          </button>
          <button
            onClick={() => {
              if (confirm(`¿Borrar el pedido de ${pedido.cliente_nombre}?`)) {
                deleteMutation.mutate(pedido.id);
              }
            }}
            disabled={deleteMutation.isPending}
            title="Eliminar pedido"
            className="w-9 h-9 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-sm flex items-center justify-center cursor-pointer active:scale-95"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* 3. Detalle de Comida y Envío */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-2xl border border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          {pedido.cantidad_regular > 0 && (
            <span className="bg-sky-100 text-sky-950 font-black text-sm px-3 py-1.5 rounded-xl border border-sky-300">
              {pedido.cantidad_regular} Regular
            </span>
          )}

          {pedido.cantidad_grande > 0 && (
            <span className="bg-orange-100 text-orange-950 font-black text-sm px-3 py-1.5 rounded-xl border border-orange-300">
              {pedido.cantidad_grande} Grande
            </span>
          )}

          {pedido.cantidad_regular === 0 && pedido.cantidad_grande === 0 && (
            <span className="bg-amber-100 text-amber-950 font-black text-sm px-3 py-1.5 rounded-xl border border-amber-300">
              🍗 Producto por Kg / Especial
            </span>
          )}

          {pedido.es_delivery ? (
            <span className="text-xs font-extrabold text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              🛵 Delivery (+${pedido.costo_delivery})
            </span>
          ) : (
            <span className="text-xs font-extrabold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              🏪 Retira en Local
            </span>
          )}
        </div>

        {/* Monto Total Destacado */}
        <div className="text-right">
          <span className="text-xs font-bold text-slate-400 block uppercase">Total</span>
          <span className="text-xl font-black text-slate-900">
            ${pedido.monto_total.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 4. Controles de Estado (Pago y Entrega) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
        {/* Cobro al Cliente */}
        <div>
          <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">
            Pago del Cliente
          </label>
          <select
            value={pedido.metodo_pago}
            onChange={(e) =>
              onUpdate(pedido.id, { metodo_pago: e.target.value as MetodoPago })
            }
            className={`w-full p-2.5 rounded-xl font-black text-sm border-2 cursor-pointer transition ${
              pedido.metodo_pago === 'pendiente'
                ? 'bg-red-50 border-red-300 text-red-700'
                : pedido.metodo_pago === 'efectivo'
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-indigo-50 border-indigo-300 text-indigo-800'
            }`}
          >
            <option value="pendiente">❌ FALTA COBRAR</option>
            <option value="efectivo">💵 Pagó EFECTIVO</option>
            <option value="transferencia">🏦 Pagó TRANSFERENCIA</option>
          </select>
        </div>

        {/* Botón Principal de Estado (Entregado / Reabrir) */}
        <div>
          <label className="block text-[11px] font-black text-slate-500 uppercase mb-1">
            Estado de la Orden
          </label>
          <button
            onClick={() => onUpdate(pedido.id, { entregado: !pedido.entregado })}
            className={`w-full p-2.5 rounded-xl font-black text-sm border-2 cursor-pointer transition active:scale-95 ${
              pedido.entregado
                ? 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'
                : 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700 shadow-xs'
            }`}
          >
            {pedido.entregado ? '↩️ Volver a Pendiente' : '✔️ MARCAR ENTREGADO'}
          </button>
        </div>
      </div>

      {/* Pago al delivery opcional */}
      {pedido.es_delivery && (
        <div className="pt-1">
          <button
            onClick={() =>
              onUpdate(pedido.id, { delivery_pagado: !pedido.delivery_pagado })
            }
            className={`w-full py-2 px-3 rounded-xl font-extrabold text-xs border cursor-pointer transition ${
              pedido.delivery_pagado
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}
          >
            {pedido.delivery_pagado ? '✅ Delivery Liquidado / Pagado' : '🛵 Marcar Delivery como Pagado'}
          </button>
        </div>
      )}
    </div>
  );
}


