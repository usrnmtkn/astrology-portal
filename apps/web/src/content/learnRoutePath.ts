/** The standalone Learn path check the app shell needs before any Learn content loads. It lives
 * apart from the Astro 101 catalog so the shell does not pull that content into startup. */
export function isStandaloneLearnPath(pathname: string) {
  return pathname === "/learn" || pathname.startsWith("/learn/");
}
