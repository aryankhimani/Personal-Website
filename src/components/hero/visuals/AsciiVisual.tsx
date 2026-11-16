import AsciiField from '../AsciiField';

/** The interactive ASCII field behind the name, with the AK logo carved out of it. */
export default function AsciiVisual() {
  return (
    <>
      <AsciiField />
      <p className="ascii-hint">move to stir · click to change the characters</p>
    </>
  );
}
