import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./sheet";

interface Props {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ title, onClose, children }: Props) {
  useLockBodyScroll();

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="p-5 pb-8">
        <div className="mx-auto w-10 h-1.5 rounded-full bg-slate-200 mb-4" />
        <SheetHeader className="text-left pr-12 pb-3 mb-3 border-b border-slate-100">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}
