import ASCIIText from '../../rb/ASCIIText';

/** ARYAN drawn in live ASCII characters. */
export default function AsciiVisual() {
  // The component sizes text in fixed pixels, so scale it to the space the hero gives it.
  const room = window.innerWidth - (window.innerWidth >= 768 ? 170 : 32);
  const textScale = Math.min(1.9, room / 660);
  return (
    <ASCIIText
      text="ARYAN"
      fontFamily="'Bricolage Grotesque Variable', sans-serif"
      fontWeight={800}
      textColor="#ece7dc"
      colors={['#ece7dc', '#d4d4d8', '#ff4a2b']}
      textScale={textScale}
      asciiFontSize={10}
      chroma={0}
      hueShift={0}
      theme="dark"
    />
  );
}
