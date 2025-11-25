import { punyEncode } from "@dub/utils";
import {
  decodeKeyIfCaseSensitive,
  encodeKey,
  isCaseSensitiveDomain,
} from "../api/links/case-sensitivity";
import { conn } from "./connection";
import { EdgeLinkProps } from "./types";

/**
 * Finds a redirect rule that matches the given path
 * Redirect rules use patterns like:
 * - `:path` - matches any path segment
 * - `*` - matches any remaining path
 * - `introduction-deck/*` - matches paths starting with introduction-deck/
 * 
 * The rule key contains the pattern (e.g., "introduction-deck/*")
 * The rule URL contains the destination with placeholders (e.g., "https://domain.com/introduction-deck/:path")
 */
export const getRedirectRuleViaEdge = async ({
  domain,
  path,
}: {
  domain: string;
  path: string;
}): Promise<(EdgeLinkProps & { matchedPath?: string; childKey?: string }) | null> => {
  const isCaseSensitive = isCaseSensitiveDomain(domain);

  // Get all redirect rules for this domain, ordered by specificity (longer patterns first)
  const { rows } =
    (await conn.execute(
      "SELECT * FROM Link WHERE domain = ? AND isRedirectRule = 1 AND archived = 0 AND (disabledAt IS NULL OR disabledAt > NOW()) AND (expiresAt IS NULL OR expiresAt > NOW()) ORDER BY LENGTH(`key`) DESC",
      [domain],
    )) || {};

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  // Normalize the path (remove leading slash, handle case sensitivity)
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const pathSegments = normalizedPath.split("/").filter(Boolean);

  // Try to match each redirect rule (most specific first)
  for (const rule of rows as EdgeLinkProps[]) {
    const ruleKey = decodeKeyIfCaseSensitive({ domain, key: rule.key });
    const normalizedRuleKey = ruleKey.startsWith("/")
      ? ruleKey.slice(1)
      : ruleKey;

    // Handle wildcard patterns like "introduction-deck/*"
    if (normalizedRuleKey.includes("*")) {
      const prefix = normalizedRuleKey.replace(/\*.*$/, "").replace(/\/$/, "");
      
      // Check if the path starts with the prefix
      if (normalizedPath.startsWith(prefix)) {
        // Extract the matched path (everything after the prefix)
        const remainingPath = normalizedPath.slice(prefix.length);
        const matchedPath = remainingPath.replace(/^\//, "") || "";
        
        // Match if:
        // 1. There's a remaining path after the prefix, OR
        // 2. The path exactly matches the prefix (for patterns like "prefix/*" matching "prefix")
        if (matchedPath || normalizedPath === prefix) {
          // Store the full child key for analytics tracking
          const childKey = normalizedPath;
          return { ...rule, matchedPath: matchedPath || "", childKey };
        }
      }
    } 
    // Handle :path pattern - matches any path
    else if (normalizedRuleKey === ":path" || normalizedRuleKey === "") {
      if (normalizedPath) {
        return { ...rule, matchedPath: normalizedPath, childKey: normalizedPath };
      }
    }
    // Handle patterns with :path placeholder like "prefix/:path"
    else if (normalizedRuleKey.includes(":path")) {
      const prefix = normalizedRuleKey.replace(/:path.*$/, "").replace(/\/$/, "");
      if (normalizedPath.startsWith(prefix)) {
        const matchedPath = normalizedPath.slice(prefix.length).replace(/^\//, "");
        if (matchedPath) {
          return { ...rule, matchedPath, childKey: normalizedPath };
        }
      }
    }
  }

  return null;
};

/**
 * Resolves the destination URL for a redirect rule
 * Replaces placeholders like :path with the actual matched path
 */
export const resolveRedirectRuleUrl = (
  url: string,
  matchedPath: string,
): string => {
  // Replace :path placeholder with the matched path
  // Handle both :path and * placeholders
  let resolved = url.replace(/:path/g, matchedPath);
  resolved = resolved.replace(/\*/g, matchedPath);
  return resolved;
};
