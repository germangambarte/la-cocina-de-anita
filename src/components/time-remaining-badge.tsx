import { useEffect, useState } from 'react';

interface Props {
  horaEntrega: string;
  entregado: boolean;
}

export function TimeRemainingBadge({ horaEntrega, entregado }: Props) {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);

  useEffect(() => {
    if (entregado) return;

    const calculateTime = () => {
      const now = new Date();
      const [hoursStr, minutesStr] = horaEntrega.split(':');
      const target = new Date();
      target.setHours(parseInt(hoursStr, 10), parseInt(minutesStr, 10), 0, 0);

      const diffMs = target.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / 60000);
      setMinutesLeft(diffMins);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 30000);
    return () => clearInterval(interval);
  }, [horaEntrega, entregado]);

  if (entregado) {
    return (
      <span className="bg-slate-200 text-slate-700 text-sm px-3.5 py-1.5 rounded-full font-bold">
        ✅ Listo
      </span>
    );
  }

  if (minutesLeft === null) return null;

  if (minutesLeft < 0) {
    return (
      <span className="bg-red-600 text-white text-xs sm:text-sm px-3 py-1 rounded-full font-black shadow-xs">
        🚨 Demorado {Math.abs(minutesLeft)} min
      </span>
    );
  }

  if (minutesLeft <= 30) {
    return (
      <span className="bg-amber-400 text-amber-950 text-xs sm:text-sm px-3 py-1 rounded-full font-extrabold shadow-xs">
        ⏰ Faltan {minutesLeft} min
      </span>
    );
  }

  return (
    <span className="bg-slate-100 text-slate-700 border border-slate-200 text-xs sm:text-sm px-3 py-1 rounded-full font-bold">
      ⏳ {horaEntrega.slice(0, 5)} hs
    </span>
  );
}
