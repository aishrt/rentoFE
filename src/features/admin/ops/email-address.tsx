/**
 * An email address that, when it doesn't fit, wraps before its "@" (as style guides break them) rather than
 * mid-word. Give the element around it `wrap-anywhere`, so a part too long for the line on its own still breaks
 * as a last resort instead of widening the page.
 */
export function EmailAddress({ email }: { email: string }) {
  const at = email.lastIndexOf('@');
  if (at <= 0) return email;
  return (
    <>
      {email.slice(0, at)}
      <wbr />
      {email.slice(at)}
    </>
  );
}
