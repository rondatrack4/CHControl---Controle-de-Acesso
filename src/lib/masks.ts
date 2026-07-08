// Máscaras de entrada automáticas

export function maskCPF(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskRG(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 9)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskPlate(value: string): string {
  const clean = value.replace(/\W/g, "").toUpperCase();
  if (clean.length <= 4) return clean;
  if (clean.length <= 8) return clean.slice(0, 4) + "-" + clean.slice(4);
  return clean.slice(0, 4) + "-" + clean.slice(4, 8);
}

export function maskPhone(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}
