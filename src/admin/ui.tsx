import type { ReactNode } from "react";
import { X } from "lucide-react";

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-3xl">{title}</h1>
      {action}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="card my-8 w-full max-w-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1 hover:bg-farm-50"><X /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-farm-700" />
      {label}
    </label>
  );
}

export function ErrorBox({ error }: { error: string | null }) {
  return error ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null;
}
