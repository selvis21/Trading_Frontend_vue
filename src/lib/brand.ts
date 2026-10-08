/**
 * BPPrime CRM — single source of truth for product branding.
 *
 * Every user-facing surface (sidebar, auth, router title, favicon) resolves
 * its name and logo from here, so the identity is defined in exactly one
 * place instead of being repeated across components.
 *
 * Logo assets are the official BP Prime artwork, self-hosted under
 * `public/brand/` so the SPA never hotlinks bpprime.com at runtime.
 * Intrinsic sizes are declared as constants and passed to <img width/height>
 * so the browser reserves the correct box before decode (no layout shift) and
 * the artwork is only ever scaled — never cropped, stretched or recoloured.
 */

/** Product name. `VITE_APP_NAME` may override it per environment. */
export const BRAND_NAME: string = import.meta.env.VITE_APP_NAME || 'BPPrime CRM';

/** Company wordmark shown in the copyright line. */
export const BRAND_COMPANY = 'BP Prime';

/**
 * Official horizontal lockup: gold diamond mark + charcoal "BP PRIME"
 * wordmark. Intrinsic 791x157 (5.038:1). Must sit on a light surface — both
 * the wordmark and the mark's charcoal core would vanish on dark chrome,
 * which is what the `plate` prop on AppLogo is for.
 */
export const BRAND_LOGO_SRC = '/brand/bp-prime-logo.png';
export const BRAND_LOGO_WIDTH = 791;
export const BRAND_LOGO_HEIGHT = 157;

/**
 * The gold diamond isolated from that same official asset (it is the leading
 * segment of the lockup, separated from the wordmark by whitespace). Used
 * when the full wordmark cannot fit, e.g. a collapsed sidebar. Intrinsic
 * 133x148.
 */
export const BRAND_MARK_SRC = '/brand/bp-prime-mark.png';
export const BRAND_MARK_WIDTH = 133;
export const BRAND_MARK_HEIGHT = 148;

/**
 * Logo gold as HSL channels, mirroring the `--brand` token in
 * src/css/app.css. Kept here for the few places that need the raw value
 * outside CSS (e.g. a canvas/JS-driven indicator). Keep in sync with --brand.
 */
export const BRAND_GOLD_HSL = '44 65% 57%';

/** Alt text — the lockup already spells the name, so keep it non-redundant. */
export const BRAND_LOGO_ALT = 'BP Prime';