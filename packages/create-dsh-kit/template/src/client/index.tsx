/**
 * Browser half of __PKG__.
 *
 * React is provided by the DSH shell at runtime; it is never bundled. The build
 * wraps this entry in `window.__ModuleLoader__.load({ id, factory })`.
 *
 * @module __PKG__/client
 */
import { NAME, NS } from "../shared/constants.ts";

/** A left-navigation glyph: replace with the plugin's own mark. */
function Icon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="none" aria-hidden="true">
      <rect x="2.75" y="2.75" width="10.5" height="10.5" rx="2" stroke="currentColor" />
      <path d="M5.5 8h5" stroke="currentColor" strokeLinecap="round" />
    </svg>
  );
}

/** The full page selected by the navigation entry. */
function Page({ t }: { t: (key: string) => string }) {
  return (
    <div style={{ padding: "24px 28px", font: "inherit" }}>
      <h1 style={{ fontSize: 20, margin: 0 }}>{t("panel.title")}</h1>
      <p style={{ marginTop: 8, color: "var(--dsw-alias-label-secondary)" }}>{t("panel.body")}</p>
    </div>
  );
}

/**
 * @param ctx - the client Cordis context.
 */
export function apply(ctx: any): void {
  ctx.effect(
    () =>
      ctx.locale.register(NS, {
        en: { "panel.title": "__TITLE_EN__", "panel.body": "__DESC_EN__" },
        zh: { "panel.title": "__TITLE_ZH__", "panel.body": "__DESC_ZH__" },
      }),
    `${NAME}: dictionaries`,
  );

  ctx.slots.inject("sidebar.panellist", () =>
    ctx.slots.register(
      {
        name: "sidebar.panellist",
        id: NAME,
        order: 60,
        label: () => ctx.locale.bind(NS)("panel.title"),
        locale: NS,
      },
      Icon,
    ),
  );

  ctx.slots.inject("main", () => ctx.slots.register({ name: "main", key: NAME, locale: NS }, Page));
}

export const name = NAME;
export const inject = ["slots", "locale"];
