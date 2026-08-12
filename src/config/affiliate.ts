/**
 * Centralized Affiliate Configuration for Indian Keto
 *
 * Single source of truth for all affiliate link generation.
 * Uses Amazon Associates program for the Indian keto niche.
 */

export interface AffiliateConfig {
  tag: string;
  marketplace: string;
  enableOneLink: boolean;
}

const AFFILIATE_TAG = (() => {
  let tag: string | undefined;
  try {
    tag = import.meta.env.PUBLIC_AMAZON_AFFILIATE_TAG;
  } catch {
    tag = undefined;
  }

  if (!tag || tag.trim() === '') {
    // Fallback to hardcoded tag for build — FLAG: needs confirmation
    tag = 'indianketo-20';
  }

  if (!/^[a-zA-Z0-9_-]+-2[0-1]$/.test(tag)) {
    console.warn(
      `PUBLIC_AMAZON_AFFILIATE_TAG has unexpected format: "${tag}". ` +
      `Expected alphanumeric characters followed by -20 or -21.`
    );
  }

  return tag;
})();

export function getAffiliateConfig(): AffiliateConfig {
  return {
    tag: AFFILIATE_TAG,
    marketplace: 'amazon.com',
    enableOneLink: false,
  };
}

export function buildAmazonProductUrl(asin: string): string {
  const { tag } = getAffiliateConfig();
  return `https://www.amazon.com/dp/${asin}?tag=${tag}`;
}

export function buildAmazonSearchUrl(keywords: string): string {
  const { tag } = getAffiliateConfig();
  return `https://www.amazon.com/s?k=${encodeURIComponent(keywords)}&tag=${tag}`;
}
