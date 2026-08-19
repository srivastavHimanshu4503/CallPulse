import { useEffect } from "react";

// Injects BreadcrumbList JSON-LD into <head> so Google renders breadcrumb
// navigation in search results. Cleans up on unmount so route changes don't
// leave stale schema. Not visible to users — pure crawler signal.
export function BreadcrumbSchema({ items }: { items: { name: string; url: string }[] }) {
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.schema = "breadcrumb";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        item: item.url,
      })),
    });
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [items]);
  return null;
}
