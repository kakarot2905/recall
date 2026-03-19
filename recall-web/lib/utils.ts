export function cn(...inputs: (string | undefined | null | boolean | Record<string, boolean>)[]): string {
  return inputs.filter(Boolean).join(" ")
}
