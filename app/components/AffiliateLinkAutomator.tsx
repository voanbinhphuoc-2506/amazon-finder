"use client";

/**
 * Affiliate link safety net: ensure outbound Amazon-family links carry tag=anvopro-20
 * (covers dynamically injected anchors, e.g. after search). Server-rendered links are
 * already tagged; this avoids missing edge cases without rescanning the whole DOM on
 * every React update.
 */

import { useEffect } from "react";

const AFFILIATE_ID = "anvopro-20";
const TARGET_DOMAINS = ["amazon.com", "amzn.to", "amazon.de"] as const;

function tagAnchor(link: HTMLAnchorElement) {
  try {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) {
      return;
    }
    const url = new URL(link.href);
    if (!TARGET_DOMAINS.some((domain) => url.hostname.includes(domain))) {
      return;
    }
    const params = new URLSearchParams(url.search);
    if (params.get("tag") === AFFILIATE_ID) {
      return;
    }
    params.set("tag", AFFILIATE_ID);
    url.search = params.toString();
    link.href = url.toString();
  } catch {
    /* invalid or opaque URL */
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
