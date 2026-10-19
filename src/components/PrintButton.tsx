"use client";

export default function PrintButton() {
  return (
    <button onClick={() => window.print()} className="rounded-md border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
      Imprimir / PDF
    </button>
  );
}
