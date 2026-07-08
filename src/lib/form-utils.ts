// Helpers para melhorar UX de formulários

/**
 * Hook pra usar em inputs que devem submeter ao pressionar Enter
 * Ideal pra buscas, inputs únicos, ou formulários simples
 */
export function useEnterSubmit(onSubmit: () => void) {
  return (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
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
