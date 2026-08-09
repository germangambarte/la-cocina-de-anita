import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ title, onClose, children }: Props) {
  useLockBodyScroll();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex overflow-y-auto z-50">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 m-auto my-auto">
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
          <h2 className="text-xl sm:text-2xl font-black text-slate-800">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 font-bold text-lg flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
