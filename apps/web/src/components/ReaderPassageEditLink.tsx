import { useEffect, useState } from 'react';

export function ReaderPassageEditLink({ href }: { href: string | null | undefined }) {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    if (!href) { setAllowed(false); return; }
    let revision = 0;
    const check = async () => {
      const current = ++revision;
      setAllowed(false);
      try {
        if (!Object.keys(localStorage).some(key => key === 'tldrastro:contentAdminSecret' || /^sb-.+-auth-token$/u.test(key))) return;
        const { verifyReaderStudioAccess } = await import('../services/studioReaderAccess');
        const verified = await verifyReaderStudioAccess();
        if (revision === current) setAllowed(verified);
      } catch { /* Reader content remains available when owner access cannot be verified. */ }
    };
    void check();
    const refresh = () => { void check(); };
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => { revision++; window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh); };
  }, [href]);
  return href && allowed ? <a className="card-read-more" href={href} target="_blank" rel="noreferrer">Edit this passage</a> : null;
}
