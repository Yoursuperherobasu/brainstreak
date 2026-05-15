// Dense diagnostic instrumentation for the click-doesn't-fire bug.
// Imported once at app start (app/_layout.tsx). On web, attaches global
// event/error listeners and exposes window.__brainDebug for ad-hoc probes.
//
// On native this is a no-op except for a startup log line.

import { Platform } from 'react-native';

const TAG = '[brain-debug]';
let installed = false;

export function installDebug(): void {
  if (installed) return;
  installed = true;

  const enabled = (globalThis as any).__BRAIN_DEBUG__ === true;
  if (!enabled) return;

  console.log(TAG, 'install start, platform=', Platform.OS, 'time=', new Date().toISOString());

  if (Platform.OS !== 'web') {
    console.log(TAG, 'native — skipping web event capture');
    return;
  }

  // Web only.
  try {
    const w: any = (globalThis as any);
    const doc = w.document as Document | undefined;
    if (!doc) {
      console.log(TAG, 'no document — bailing');
      return;
    }

    // 1) Catch every uncaught error and rejection
    w.addEventListener('error', (e: ErrorEvent) => {
      console.log(TAG, 'window.error', e.message, 'src=', e.filename, ':', e.lineno);
    });
    w.addEventListener('unhandledrejection', (e: PromiseRejectionEvent) => {
      console.log(TAG, 'unhandledrejection', String(e.reason));
    });

    // 2) Capture every click ANYWHERE in the document at the capture phase
    //    so we can see what gets clicked even if a child stops propagation.
    const onClickCapture = (e: Event) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName ?? '?';
      const cls = (t?.getAttribute && t.getAttribute('class')) || '';
      const txt = (t?.textContent || '').slice(0, 40).replace(/\s+/g, ' ').trim();
      const id = t?.id || '';
      console.log(TAG, 'click', { tag, id, cls: cls.slice(0, 60), text: txt });
    };
    doc.addEventListener('click', onClickCapture, true);

    // 3) Same for mousedown/touchstart so we can tell whether events fail
    //    upstream before click would even fire.
    doc.addEventListener('mousedown', (e) => {
      const t = e.target as HTMLElement | null;
      console.log(TAG, 'mousedown', t?.tagName, (t?.textContent || '').slice(0, 40));
    }, true);
    doc.addEventListener('touchstart', (e) => {
      const t = e.target as HTMLElement | null;
      console.log(TAG, 'touchstart', t?.tagName, (t?.textContent || '').slice(0, 40));
    }, { capture: true, passive: true });

    // 4) Expose a helper so you can run __brainDebug.findButton() from the
    //    DevTools console to inspect the rendered button.
    w.__brainDebug = {
      findButton: () => {
        const b = doc.querySelectorAll('button');
        console.log(TAG, 'buttons in DOM:', b.length);
        b.forEach((el, i) => {
          const txt = (el.textContent || '').slice(0, 60);
          const onclick = (el as any).onclick ? 'YES' : 'no';
          const disabled = (el as HTMLButtonElement).disabled;
          console.log(TAG, ` [${i}] disabled=${disabled} onclick-prop=${onclick} text="${txt}"`);
        });
        return b;
      },
      clickFirst: () => {
        const b = doc.querySelector('button') as HTMLButtonElement | null;
        if (!b) { console.log(TAG, 'no button found'); return; }
        console.log(TAG, 'simulating click on first button:', b.textContent);
        b.click();
      },
      ssrError: () => {
        const s = doc.getElementById('_expo-static-error');
        if (s) console.log(TAG, 'SSR ERROR PRESENT', s.textContent?.slice(0, 200));
        else console.log(TAG, 'no SSR error element');
      },
    };

    console.log(TAG, 'install complete. Type __brainDebug.findButton() in console to inspect.');
  } catch (e) {
    console.log(TAG, 'install failed', String(e));
  }
}
