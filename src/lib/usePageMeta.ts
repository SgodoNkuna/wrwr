import { useEffect } from "react";

const SITE = "Tshehla AgriHub";
const setMeta = (attr: "name" | "property", key: string, content: string) => {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.content = content;
};

/** Per-page <title>, description, canonical and Open Graph tags (SEO). */
export function usePageMeta(title: string, description: string, opts: { image?: string; noindex?: boolean } = {}) {
  useEffect(() => {
    const full = title.includes(SITE) ? title : `${title} | ${SITE}`;
    document.title = full;
    setMeta("name", "description", description);
    setMeta("property", "og:title", full);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", window.location.origin + window.location.pathname);
    if (opts.image) setMeta("property", "og:image", new URL(opts.image, window.location.origin).href);
    setMeta("name", "robots", opts.noindex ? "noindex, nofollow" : "index, follow");
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = window.location.origin + window.location.pathname;
  }, [title, description, opts.image, opts.noindex]);
}
