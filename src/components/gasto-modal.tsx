import { useState } from 'react';
import {
  Beef,
  Carrot,
  ShoppingCart,
  Croissant,
  Package,
  Flame,
  HelpCircle,
  Banknote,
  Landmark,
  type LucideIcon,
} from 'lucide-react';
import { useCreateGasto, useUpdateGasto } from '../hooks/useGastos';
import type { Gasto, CategoriaGasto } from '../types/database';
import { Modal } from './ui/modal';

interface Props {
  gastoAEditar?: Gasto | null;
  onClose: () => void;
}

const PRESETS: { label: string; icon: LucideIcon; categoria: CategoriaGasto }[] = [
  { label: 'Carnicería / Pollería', icon: Beef, categoria: 'carnes' },
  { label: 'Verdulería', icon: Carrot, categoria: 'verduras_hortalizas' },
  { label: 'Almacén', icon: ShoppingCart, categoria: 'almacen_pan' },
  { label: 'Panadería', icon: Croissant, categoria: 'almacen_pan' },
  { label: 'Envases / Descartables', icon: Package, categoria: 'descartables_envases' },
  { label: 'Gas / Luz / Servicios', icon: Flame, categoria: 'servicios_gas_luz' },
  { label: 'Gastos Varios / Otro', icon: HelpCircle, categoria: 'varios' },
];

export function GastoModal({ gastoAEditar, onClose }: Props) {
  const [concepto, setConcepto] = useState(
    gastoAEditar?.concepto ?? 'Carnicería / Pollería',
  );
  const [monto, setMonto] = useState(
    gastoAEditar ? String(gastoAEditar.monto) : '',
  );
  const [categoria, setCategoria] = useState<CategoriaGasto>(
    gastoAEditar?.categoria ?? 'carnes',
  );
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>(
    gastoAEditar?.metodo_pago ?? 'efectivo',
  );

  const createGasto = useCreateGasto();
  const updateGasto = useUpdateGasto();

  const handleSelectPreset = (preset: (typeof PRESETS)[0]) => {
    setConcepto(preset.label);
    setCategoria(preset.categoria);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!monto || Number(monto) <= 0) {
      alert('Por favor ingresá un monto mayor a $0.');
      return;
    }

    const conceptoFinal = concepto.trim() || 'Gasto General';

    if (gastoAEditar) {
      updateGasto.mutate(
        {
          id: gastoAEditar.id,
          updates: {
            concepto: conceptoFinal,
            monto: Number(monto),
            categoria,
            metodo_pago: metodoPago,
          },
        },
        { onSuccess: () => onClose() }
      );
    } else {
      createGasto.mutate(
        {
          concepto: conceptoFinal,
          monto: Number(monto),
          categoria,
          metodo_pago: metodoPago,
          fecha: new Date().toISOString().split('T')[0],
        },
        { onSuccess: () => onClose() }
      );
    }
  };

  const isPending = createGasto.isPending || updateGasto.isPending;

  return (
    <Modal
      title={gastoAEditar ? 'Editar Gasto' : 'Registrar Gasto / Compra'}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Botones Rápidos de Selección */}
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-2">
              ¿En dónde compraste? (Elegí una opción)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => {
                const seleccionado = concepto === p.label;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`py-3 px-2 rounded-2xl font-extrabold text-xs sm:text-sm border-2 transition cursor-pointer flex items-center gap-2 active:scale-95 ${
                      seleccionado
                        ? 'bg-rose-600 border-rose-700 text-white shadow-md scale-[1.02]'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center justify-center w-8 h-8">
                      <p.icon className="w-6 h-6" />
                    </span>
                    <span className="truncate">{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opción de escribir/editar concepto si se requiere */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Detalle o Nota (opcional)
            </label>
            <input
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-bold text-slate-800 bg-rose-50/30"
            />
          </div>

          {/* 2. Monto Gastado */}
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-1">
              Monto Gastado ($)
            </label>
            <input
              type="number"
              required
              min="1"
              placeholder="Ej: 15000"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="w-full border-2 border-rose-300 bg-rose-50 rounded-2xl p-3 text-center text-2xl font-black text-rose-950 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          {/* 3. Medio de Pago */}
          <div>
            <label className="block text-xs font-black text-slate-600 uppercase mb-1">
              Forma de Pago
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMetodoPago('efectivo')}
                className={`py-3 rounded-xl font-extrabold text-sm border-2 cursor-pointer transition flex items-center justify-center gap-2 ${
                  metodoPago === 'efectivo'
                    ? 'bg-emerald-600 border-emerald-700 text-white shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Banknote className="w-5 h-5" /> Efectivo
              </button>
              <button
                type="button"
                onClick={() => setMetodoPago('transferencia')}
                className={`py-3 rounded-xl font-extrabold text-sm border-2 cursor-pointer transition flex items-center justify-center gap-2 ${
                  metodoPago === 'transferencia'
                    ? 'bg-indigo-600 border-indigo-700 text-white shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Landmark className="w-5 h-5" /> Transferencia
              </button>
            </div>
          </div>

          {/* Botones de Acción */}
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
              className="flex-2 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-base font-black disabled:opacity-50 cursor-pointer shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              {isPending ? 'Guardando...' : <><Banknote className="w-5 h-5" /> GUARDAR GASTO</>}
            </button>
          </div>
        </form>
    </Modal>
  );
}

