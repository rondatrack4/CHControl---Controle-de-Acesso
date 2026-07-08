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

export function formatPlateMercosul(value: string): string {
  const clean = value.replace(/\W/g, "").toUpperCase();
  // Formato: ABC1D23 (3 letras, 1 número, 1 letra, 2 números)
  if (clean.length <= 3) return clean;
  if (clean.length <= 4) return clean.slice(0, 3) + clean[3];
  if (clean.length <= 5) return clean.slice(0, 3) + clean[3] + clean[4];
  if (clean.length <= 7) return clean.slice(0, 3) + clean[3] + clean[4] + clean.slice(5, 7);
  return clean.slice(0, 3) + clean[3] + clean[4] + clean.slice(5, 7);
}

export function formatPlateOld(value: string): string {
  const clean = value.replace(/\W/g, "").toUpperCase();
  // Formato: BUY-8593 (3 letras, hífen, 4 números)
  if (clean.length <= 3) return clean;
  if (clean.length <= 7) return clean.slice(0, 3) + "-" + clean.slice(3);
  return clean.slice(0, 3) + "-" + clean.slice(3, 7);
}

export function maskPhone(value: string): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}
