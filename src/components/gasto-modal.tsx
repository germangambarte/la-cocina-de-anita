import { useState, useEffect } from 'react';
import { useCreateGasto, useUpdateGasto } from '../hooks/useGastos';
import type { Gasto, CategoriaGasto } from '../types/database';

interface Props {
  gastoAEditar?: Gasto | null;
  onClose: () => void;
}

const CATEGORIAS: { id: CategoriaGasto; label: string; icon: string }[] = [
  { id: 'carnes', label: 'Carnes', icon: '🥩' },
  { id: 'verduras_hortalizas', label: 'Verduras y Hortalizas', icon: '🥬' },
  { id: 'pastas_legumbres', label: 'Pastas y Legumbres', icon: '🍝' },
  { id: 'almacen_pan', label: 'Almacén / Panadería', icon: '🍞' },
  { id: 'descartables_envases', label: 'Envases / Descartables', icon: '📦' },
  { id: 'servicios_gas_luz', label: 'Servicios (Gas, Luz, Agua)', icon: '🔥' },
  { id: 'varios', label: 'Gastos Varios', icon: '🛒' },
];

export function GastoModal({ gastoAEditar, onClose }: Props) {
  const [concepto, setConcepto] = useState('');
  const [monto, setMonto] = useState('');
  const [categoria, setCategoria] = useState<CategoriaGasto>('verduras_hortalizas');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo');

  const createGasto = useCreateGasto();
  const updateGasto = useUpdateGasto();

  // Si viene un gasto para editar, cargamos sus valores
  useEffect(() => {
    if (gastoAEditar) {
      setConcepto(gastoAEditar.concepto);
      setMonto(String(gastoAEditar.monto));
      setCategoria(gastoAEditar.categoria);
      setMetodoPago(gastoAEditar.metodo_pago);
    }
  }, [gastoAEditar]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!monto || Number(monto) <= 0) return;

    if (gastoAEditar) {
      // MODO EDICIÓN
      updateGasto.mutate(
        {
          id: gastoAEditar.id,
          updates: {
            concepto: concepto.trim() || 'Compra de insumos',
            monto: Number(monto),
            categoria,
            metodo_pago: metodoPago,
          },
        },
        { onSuccess: () => onClose() }
      );
    } else {
      // MODO CREACIÓN
      createGasto.mutate(
        {
          concepto: concepto.trim() || 'Compra de insumos',
          monto: Number(monto),
          categoria,
          metodo_pago: metodoPago,
          fecha: new Date().toISOString().split('T')[0], // "YYYY-MM-DD"
        },
        { onSuccess: () => onClose() }
      );
    }
  };

  const isPending = createGasto.isPending || updateGasto.isPending;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <h2 className="text-xl font-extrabold text-slate-800 mb-4">
          {gastoAEditar ? '✏️ Editar Compra / Gasto' : '💸 Registrar Compra / Gasto'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              ¿Qué se compró? (Concepto)
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Verdulería 5kg papas y tomates"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Monto Gastado ($)
            </label>
            <input
              type="number"
              required
              min="1"
              placeholder="Ej: 12500"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-lg font-black text-rose-700 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Categoría del Insumo
            </label>
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaGasto)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-bold bg-white cursor-pointer"
            >
              {CATEGORIAS.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Medio de Pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMetodoPago('efectivo')}
                className={`p-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                  metodoPago === 'efectivo'
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                💵 Efectivo
              </button>
              <button
                type="button"
                onClick={() => setMetodoPago('transferencia')}
                className={`p-2.5 rounded-xl font-bold text-xs border cursor-pointer ${
                  metodoPago === 'transferencia'
                    ? 'bg-indigo-100 border-indigo-400 text-indigo-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                🏦 Transferencia
              </button>
            </div>
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
              className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-extrabold hover:bg-rose-700 disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {isPending
                ? 'Guardando...'
                : gastoAEditar
                ? 'Actualizar'
                : 'Guardar Gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
