export function Swatch({ hex, size = 14 }: { hex: string | null; size?: number }) {
  if (!hex) return null;
  const style =
    hex === 'multi'
      ? { width: size, height: size, background: 'conic-gradient(#B8312F, #E6C44A, #3F7A4E, #3C6EB4, #6A4C93, #B8312F)' }
      : { width: size, height: size, background: hex };
  return <span className="swatch" style={style} aria-hidden="true" />;
}
