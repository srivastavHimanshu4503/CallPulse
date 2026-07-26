import { useEffect } from "react";

// Sets per-route <title>, meta description, and canonical link. Runs on
// mount and every prop change. Prerender captures the DOM after this
// effect fires (renderAfterTime waits ~3.5s), so the emitted HTML has the
// correct SEO tags baked in.
export function useSeoMeta({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  ogUrl,
}: {
  title: string;
  description: string;
  canonical: string;
  ogTitle?: string;
  ogDescription?: string;
  ogUrl?: string;
}) {
  useEffect(() => {
    document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:title", ogTitle ?? title);
    setMeta("property", "og:description", ogDescription ?? description);
    setMeta("property", "og:url", ogUrl ?? canonical);
    setMeta("name", "twitter:title", ogTitle ?? title);
    setMeta("name", "twitter:description", ogDescription ?? description);
    setLink("canonical", canonical);
  }, [title, description, canonical, ogTitle, ogDescription, ogUrl]);
}

function setMeta(attr: "name" | "property", key: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}
