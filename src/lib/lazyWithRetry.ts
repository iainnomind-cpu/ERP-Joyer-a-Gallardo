import { ComponentType, lazy } from 'react';

const RELOAD_FLAG = 'chunk_reload_attempt';

/**
 * Igual que React.lazy, pero tolerante a despliegues nuevos.
 *
 * Cuando se publica una versión nueva, los archivos .js con hash de la versión
 * anterior dejan de existir. Si el usuario tenía la pestaña abierta y pulsa
 * "Ventas", el import() falla y React desmonta la app => pantalla en blanco.
 *
 * Aquí reintentamos una vez y, si vuelve a fallar, recargamos la página una
 * sola vez (controlado por sessionStorage para no entrar en bucle).
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  name = 'módulo'
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RELOAD_FLAG);
      return mod;
    } catch (err) {
      // Segundo intento: puede ser un fallo de red puntual.
      try {
        const mod = await factory();
        sessionStorage.removeItem(RELOAD_FLAG);
        return mod;
      } catch (err2) {
        const alreadyTried = sessionStorage.getItem(RELOAD_FLAG);
        if (!alreadyTried) {
          sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
          console.warn(`[lazyWithRetry] No se pudo cargar ${name}; recargando para obtener la versión nueva.`, err2);
          window.location.reload();
          // Promesa que nunca resuelve: la página se está recargando.
          return new Promise<{ default: T }>(() => {});
        }
        console.error(`[lazyWithRetry] Fallo persistente al cargar ${name}`, err2);
        throw err2;
      }
    }
  });
}
