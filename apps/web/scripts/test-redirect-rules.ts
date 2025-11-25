/**
 * Simple test script to verify redirect rule pattern matching logic
 * Run with: pnpm tsx scripts/test-redirect-rules.ts
 */

// Test the pattern matching logic
function testPatternMatching() {
  const testCases = [
    {
      ruleKey: "introduction-deck/*",
      path: "introduction-deck/clientA",
      expectedMatch: true,
      expectedMatchedPath: "clientA",
    },
    {
      ruleKey: "introduction-deck/*",
      path: "introduction-deck/clientB",
      expectedMatch: true,
      expectedMatchedPath: "clientB",
    },
    {
      ruleKey: "introduction-deck/*",
      path: "introduction-deck",
      expectedMatch: true,
      expectedMatchedPath: "",
    },
    {
      ruleKey: ":path",
      path: "anything",
      expectedMatch: true,
      expectedMatchedPath: "anything",
    },
    {
      ruleKey: "prefix/:path",
      path: "prefix/value",
      expectedMatch: true,
      expectedMatchedPath: "value",
    },
    {
      ruleKey: "introduction-deck/*",
      path: "other-path",
      expectedMatch: false,
    },
  ];

  console.log("Testing redirect rule pattern matching logic...\n");

  for (const testCase of testCases) {
    const { ruleKey, path, expectedMatch, expectedMatchedPath } = testCase;
    const normalizedRuleKey = ruleKey.startsWith("/")
      ? ruleKey.slice(1)
      : ruleKey;
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;

    let matched = false;
    let matchedPath = "";

    // Simulate the matching logic
    if (normalizedRuleKey.includes("*")) {
      const prefix = normalizedRuleKey.replace(/\*.*$/, "").replace(/\/$/, "");
      if (normalizedPath.startsWith(prefix)) {
        const remainingPath = normalizedPath.slice(prefix.length);
        matchedPath = remainingPath.replace(/^\//, "") || "";
        if (matchedPath || normalizedPath === prefix) {
          matched = true;
        }
      }
    } else if (normalizedRuleKey === ":path" || normalizedRuleKey === "") {
      if (normalizedPath) {
        matched = true;
        matchedPath = normalizedPath;
      }
    } else if (normalizedRuleKey.includes(":path")) {
      const prefix = normalizedRuleKey.replace(/:path.*$/, "").replace(/\/$/, "");
      if (normalizedPath.startsWith(prefix)) {
        matchedPath = normalizedPath.slice(prefix.length).replace(/^\//, "");
        if (matchedPath) {
          matched = true;
        }
      }
    }

    const passed = matched === expectedMatch && 
      (!expectedMatch || matchedPath === expectedMatchedPath);

    console.log(
      `Rule: "${ruleKey}" | Path: "${path}" | Expected: ${expectedMatch ? `match "${expectedMatchedPath}"` : "no match"} | Got: ${matched ? `match "${matchedPath}"` : "no match"} | ${passed ? "✅ PASS" : "❌ FAIL"}`
    );
  }
}

// Test URL resolution
function testUrlResolution() {
  console.log("\n\nTesting URL resolution...\n");

  const testCases = [
    {
      url: "https://domain.com/introduction-deck/:path",
      matchedPath: "clientA",
      expected: "https://domain.com/introduction-deck/clientA",
    },
    {
      url: "https://domain.com/:path",
      matchedPath: "test",
      expected: "https://domain.com/test",
    },
    {
      url: "https://domain.com/products/*",
      matchedPath: "item123",
      expected: "https://domain.com/products/item123",
    },
  ];

  for (const testCase of testCases) {
    const { url, matchedPath, expected } = testCase;
    let resolved = url.replace(/:path/g, matchedPath);
    resolved = resolved.replace(/\*/g, matchedPath);

    const passed = resolved === expected;
    console.log(
      `URL: "${url}" | Matched: "${matchedPath}" | Expected: "${expected}" | Got: "${resolved}" | ${passed ? "✅ PASS" : "❌ FAIL"}`
    );
  }
}

testPatternMatching();
testUrlResolution();

console.log("\n\nTest completed!");
