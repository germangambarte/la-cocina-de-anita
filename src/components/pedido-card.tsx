import { TimeRemainingBadge } from './time-remaining-badge';
import type { Pedido, MetodoPago } from '../types/database';
import { useDeletePedido } from '../hooks/usePedidos';

interface Props {
  pedido: Pedido;
  onUpdate: (id: string, updates: Partial<Pedido>) => void;
  onEdit: (pedido: Pedido) => void; // 👈 Callback para editar
}

export function PedidoCard({ pedido, onUpdate, onEdit }: Props) {
  const deleteMutation = useDeletePedido();

  const handleDelete = () => {
    if (confirm(`¿Seguro que querés borrar el pedido de ${pedido.cliente_nombre}?`)) {
      deleteMutation.mutate(pedido.id);
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border-2 p-5 shadow-xs transition-all relative ${
        pedido.entregado
          ? 'border-slate-200 bg-slate-50/80 opacity-80'
          : 'border-slate-200 hover:border-amber-300'
      }`}
    >
      {/* 1. ENCABEZADO: Cliente + Menú + Acciones rápidas (Editar / Borrar) */}
      <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-100 pb-3">
        <div>
          <span className="text-2xl font-black text-slate-800 tracking-tight block">
            {pedido.cliente_nombre}
          </span>
          <div className="flex items-center gap-2 mt-1">
            <span className="bg-amber-100 text-amber-900 font-bold text-xs px-2.5 py-0.5 rounded-md border border-amber-200">
              🍲 {pedido.menu_nombre || 'Menú del Día'}
            </span>
            <span className="text-xs font-bold text-slate-500">
              Hora: <strong className="text-slate-800">{pedido.hora_entrega.slice(0, 5)} hs</strong>
            </span>
          </div>
        </div>

        {/* Botones de Edición / Borrado + Badge de Tiempo */}
        <div className="flex items-center gap-2">
          <TimeRemainingBadge horaEntrega={pedido.hora_entrega} entregado={pedido.entregado} />
          
          <button
            onClick={() => onEdit(pedido)}
            title="Editar pedido"
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold cursor-pointer"
          >
            ✏️
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            title="Eliminar pedido"
            className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 text-xs font-bold cursor-pointer"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Resto de la PedidoCard (Viandas, Modalidad, Estado de Pago, etc. se mantiene igual) */}
      <div className="py-3.5">
        <div className="flex flex-wrap gap-2.5">
          {pedido.cantidad_regular > 0 && (
            <div className="flex items-center gap-2 bg-sky-100 border border-sky-300 text-sky-900 px-3.5 py-2 rounded-xl">
              <span className="bg-sky-600 text-white font-black text-lg px-2.5 py-0.5 rounded-lg">
                {pedido.cantidad_regular}
              </span>
              <span className="font-bold text-base">Vianda Regular</span>
            </div>
          )}

          {pedido.cantidad_grande > 0 && (
            <div className="flex items-center gap-2 bg-orange-100 border border-orange-300 text-orange-900 px-3.5 py-2 rounded-xl">
              <span className="bg-orange-600 text-white font-black text-lg px-2.5 py-0.5 rounded-lg">
                {pedido.cantidad_grande}
              </span>
              <span className="font-bold text-base">Vianda Grande</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-between items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
        <div>
          {pedido.es_delivery ? (
            <div className="flex items-center gap-2 text-blue-700 font-bold text-base">
              <span className="text-xl">🛵</span>
              <span>Delivery (+${pedido.costo_delivery})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-700 font-bold text-base">
              <span className="text-xl">🏪</span>
              <span>Retira en local</span>
            </div>
          )}
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 block font-semibold">Total a cobrar</span>
          <span className="text-2xl font-black text-slate-900">
            ${pedido.monto_total.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        <div className="flex flex-col">
          <label className="text-[11px] font-bold text-slate-400 uppercase mb-1">
            Pago del Cliente
          </label>
          <select
            value={pedido.metodo_pago}
            onChange={(e) =>
              onUpdate(pedido.id, { metodo_pago: e.target.value as MetodoPago })
            }
            className={`w-full p-2.5 rounded-xl font-bold text-sm border-2 cursor-pointer transition ${
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

        {pedido.es_delivery ? (
          <div className="flex flex-col">
            <label className="text-[11px] font-bold text-slate-400 uppercase mb-1">
              Pago al Cadete
            </label>
            <button
              onClick={() =>
                onUpdate(pedido.id, { delivery_pagado: !pedido.delivery_pagado })
              }
              className={`w-full p-2.5 rounded-xl font-bold text-sm border-2 transition cursor-pointer flex items-center justify-center gap-1.5 ${
                pedido.delivery_pagado
                  ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                  : 'bg-amber-100 border-amber-400 text-amber-900 animate-pulse'
              }`}
            >
              {pedido.delivery_pagado ? '✅ Cadete Pagado' : '⚠️ Debe al Cadete'}
            </button>
          </div>
        ) : (
          <div className="hidden sm:block" />
        )}

        <div className="flex flex-col">
          <label className="text-[11px] font-bold text-slate-400 uppercase mb-1">
            Acción
          </label>
          <button
            onClick={() => onUpdate(pedido.id, { entregado: !pedido.entregado })}
            className={`w-full p-2.5 rounded-xl font-bold text-sm border-2 transition cursor-pointer ${
              pedido.entregado
                ? 'bg-slate-200 border-slate-300 text-slate-700 hover:bg-slate-300'
                : 'bg-emerald-600 border-emerald-700 text-white hover:bg-emerald-700 shadow-xs'
            }`}
          >
            {pedido.entregado ? '↩️ Reabrir Pedido' : '✔️ Marcar Entregado'}
          </button>
        </div>
      </div>
    </div>
  );
}
