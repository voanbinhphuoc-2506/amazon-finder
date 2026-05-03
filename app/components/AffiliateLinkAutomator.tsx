"use client";

/**
 * Client safety net: re-apply Associates tag after hydration (incl. sspa/sponsored URLs).
 * Server/API use the same logic in `@/app/lib/amazonAffiliateUrl`.
 */

import { useEffect } from "react";
import { applyAmazonAssociatesTag } from "@/app/lib/amazonAffiliateUrl";

function tagAnchor(link: HTMLAnchorElement) {
  const href = link.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
    return;
  }
  try {
    const next = applyAmazonAssociatesTag(link.href);
    link.href = next;
  } catch {
    /* invalid URL */
  }
}

function scanSubtree(root: Node) {
  if (root.nodeType === Node.ELEMENT_NODE) {
    const el = root as Element;
    if (el instanceof HTMLAnchorElement && el.hasAttribute("href")) {
      tagAnchor(el);
    }
    el.querySelectorAll("a[href]").forEach((node) => {
      if (node instanceof HTMLAnchorElement) {
        tagAnchor(node);
      }
    });
  }
}

export function AffiliateLinkAutomator() {
  useEffect(() => {
    scanSubtree(document.body);

    let debounce: ReturnType<typeof setTimeout> | undefined;
    const schedule = (mutations: MutationRecord[]) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        for (const m of mutations) {
          for (const node of m.addedNodes) {
            scanSubtree(node);
          }
        }
      }, 120);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      clearTimeout(debounce);
      observer.disconnect();
    };
  }, []);

  return null;
}
