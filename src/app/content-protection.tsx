'use client';

import { useEffect } from 'react';

// Casual-user deterrent only — right-click and these shortcuts can always be re-enabled via the
// browser's own menu (or by disabling JS), so this does not stop anyone determined to inspect
// network requests or view-source. It just removes the one-click path for the average visitor.
// Only active in production so dev tools/HMR debugging in local dev is unaffected.
export function ContentProtection() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    const blockContextMenu = (event: MouseEvent) => event.preventDefault();

    const blockDevToolsShortcuts = (event: KeyboardEvent) => {
      const ctrlOrCmd = event.ctrlKey || event.metaKey;
      const key = event.key.toUpperCase();

      const isF12 = key === 'F12';
      const isInspectOrConsole = ctrlOrCmd && event.shiftKey && ['I', 'J', 'C'].includes(key);
      const isViewSource = ctrlOrCmd && key === 'U';

      if (isF12 || isInspectOrConsole || isViewSource) event.preventDefault();
    };

    document.addEventListener('contextmenu', blockContextMenu);
    document.addEventListener('keydown', blockDevToolsShortcuts);
    return () => {
      document.removeEventListener('contextmenu', blockContextMenu);
      document.removeEventListener('keydown', blockDevToolsShortcuts);
    };
  }, []);

  return null;
}
