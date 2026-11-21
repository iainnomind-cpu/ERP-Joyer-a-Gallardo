import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Nombre del módulo/área, para mostrarlo en el mensaje de error */
  label?: string;
  /** Si cambia, el boundary se resetea (p. ej. al cambiar de módulo) */
  resetKey?: string;
}

interface State {
  error: Error | null;
  prevResetKey?: string;
}

/**
 * Evita la "pantalla en blanco": si un módulo truena al renderizar,
 * React desmonta todo el árbol y el usuario sólo ve blanco.
 * Aquí atrapamos el error, lo mostramos y ofrecemos recargar.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, prevResetKey: this.props.resetKey };

  static getDerivedStateFromProps(props: Props, state: State): State | null {
    if (props.resetKey !== state.prevResetKey) {
      return { error: null, prevResetKey: props.resetKey };
    }
    return null;
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', this.props.label || '', error, info.componentStack);
  }

  private isChunkError(error: Error) {
    const msg = `${error?.name || ''} ${error?.message || ''}`;
    return /ChunkLoadError|Loading chunk|dynamically imported module|Importing a module script failed|Failed to fetch/i.test(msg);
  }

  private handleReload = () => {
    // Recarga forzada desde el servidor para traer la versión nueva
    window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const chunk = this.isChunkError(error);

    return (
      <div className="flex items-center justify-center p-6 min-h-[60vh]">
        <div className="max-w-lg w-full bg-white border border-red-200 rounded-2xl shadow-lg p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            !
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">
            {chunk ? 'Hay una versión nueva del sistema' : 'Ocurrió un error al abrir esta sección'}
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            {chunk
              ? 'Tu navegador tiene guardada una versión anterior. Recarga la página para continuar.'
              : `No se pudo mostrar ${this.props.label || 'esta sección'}. Puedes recargar e intentar de nuevo.`}
          </p>
          <pre className="text-left text-[11px] bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 overflow-auto max-h-32 text-gray-600 whitespace-pre-wrap">
            {error.message}
          </pre>
          <button
            onClick={this.handleReload}
            className="px-5 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700"
          >
            Recargar página
          </button>
        </div>
      </div>
    );
  }
}
