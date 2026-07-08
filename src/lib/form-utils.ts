// Helpers para melhorar UX de formulários

/**
 * Hook pra usar em inputs ou divs que devem submeter ao pressionar Enter
 * Ideal pra buscas, inputs únicos, ou formulários simples
 */
export function useEnterSubmit(onSubmit: () => void) {
  return (e: React.KeyboardEvent<HTMLInputElement | HTMLDivElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      // Se for um input, permite; se for div, só permite se o target for input
      if (e.target instanceof HTMLInputElement || e.currentTarget instanceof HTMLDivElement) {
        e.preventDefault();
        onSubmit();
      }
    }
  };
}

/**
 * Componente wrapper que captura Enter em qualquer input dentro
 * Use assim: <FormWithEnterSubmit onSubmit={handleSubmit}>
 */
export function useFormEnter(onSubmit: () => void) {
  return (e: React.KeyboardEvent<HTMLDivElement | HTMLFormElement>) => {
    if (e.key === "Enter" && !e.shiftKey && e.target instanceof HTMLInputElement) {
      e.preventDefault();
      onSubmit();
    }
  };
}
