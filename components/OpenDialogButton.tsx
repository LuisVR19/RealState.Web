"use client";

import type { ReactNode } from "react";
import { useUI, type DialogState } from "./ui-provider";

/** Botón que abre un diálogo global desde un Server Component. */
export function OpenDialogButton({ dialog, className, style, children }: { dialog: Exclude<DialogState, null>; className?: string; style?: React.CSSProperties; children: ReactNode }) {
  const { open } = useUI();
  return <button type="button" className={className} style={style} onClick={() => open(dialog)}>{children}</button>;
}
