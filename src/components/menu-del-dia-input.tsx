import { useState } from 'react';
import { Soup, Save } from 'lucide-react';
import { useMenuDelDia } from '../hooks/useMenuDelDia.ts';

export function MenuDelDiaInput() {
  const { menuDelDia, actualizarMenu, isUpdating } = useMenuDelDia();
  const [texto, setTexto] = useState('');
  const [editado, setEditado] = useState(false);
  const [menuPrevio, setMenuPrevio] = useState(menuDelDia);

  // Si el menú cambia en la base de datos y el usuario no está editando, sincronizar
  if (menuDelDia !== menuPrevio) {
    setMenuPrevio(menuDelDia);
    if (!editado) {
      setTexto(menuDelDia);
    }
  }

  const handleGuardar = () => {
    actualizarMenu(texto);
    setEditado(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGuardar();
    }
  };

  return (
    <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200/80 flex flex-wrap items-center gap-2">
      <span className="text-xs font-black uppercase text-amber-900 tracking-wider flex items-center gap-1">
        <Soup className="w-4 h-4" /> Menú del Día:
      </span>
      <input
        type="text"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setEditado(true);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Ej: Pastel de Papa"
        className="flex-1 min-w-[200px] bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
      />

      {editado && (
        <button
          onClick={handleGuardar}
          disabled={isUpdating}
          className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-black px-3 py-1.5 rounded-lg transition shadow-xs cursor-pointer active:scale-95 flex items-center gap-1"
        >
          {isUpdating ? 'Guardando...' : <><Save className="w-3.5 h-3.5" /> Guardar</>}
        </button>
      )}
    </div>
  );
}
