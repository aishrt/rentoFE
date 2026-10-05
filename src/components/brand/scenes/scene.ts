/**
 * The page scenes (brand art behind a page's top section). Each is one inline SVG of a few KB in the hero
 * landscape's palette, and each shows what its page is about, so no two pages share a background.
 */
export interface SceneProps {
  className?: string;
  /** Prefix for the SVG gradient ids; give each instance on the same page its own. */
  idPrefix?: string;
}
