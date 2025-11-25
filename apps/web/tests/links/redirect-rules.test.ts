import { normalizeWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { Link } from "@dub/prisma/client";
import { describe, expect, onTestFinished, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";
import { E2E_LINK } from "../utils/resource";
import { LinkSchema } from "../utils/schema";

const { domain, url } = E2E_LINK;

describe.sequential("Redirect Rules", async () => {
  const h = new IntegrationHarness();
  const { workspace, user, http } = await h.init();
  const workspaceId = workspace.id;
  const projectId = normalizeWorkspaceId(workspaceId);

  test("create redirect rule with wildcard pattern", async () => {
    onTestFinished(async () => {
      await h.deleteLink(link.id);
    });

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      body: {
        domain,
        key: "introduction-deck/*",
        url: "https://example.com/introduction-deck/:path",
        isRedirectRule: true,
      },
    });

    expect(status).toEqual(200);
    expect(link.isRedirectRule).toBe(true);
    expect(link.key).toBe("introduction-deck/*");
    expect(link.url).toBe("https://example.com/introduction-deck/:path");
    expect(LinkSchema.strict().parse(link)).toBeTruthy();
  });

  test("create redirect rule with :path pattern", async () => {
    onTestFinished(async () => {
      await h.deleteLink(link.id);
    });

    const { status, data: link } = await http.post<Link>({
      path: "/links",
      body: {
        domain,
        key: ":path",
        url: "https://example.com/:path",
        isRedirectRule: true,
      },
    });

    expect(status).toEqual(200);
    expect(link.isRedirectRule).toBe(true);
    expect(link.key).toBe(":path");
    expect(link.url).toBe("https://example.com/:path");
    expect(LinkSchema.strict().parse(link)).toBeTruthy();
  });

  test("redirect rule validation - invalid pattern", async () => {
    const { status, data } = await http.post({
      path: "/links",
      body: {
        domain,
        key: "invalid-pattern",
        url: "https://example.com/test",
        isRedirectRule: true,
      },
    });

    expect(status).toEqual(400);
    expect(data.error).toContain("Redirect rule key must contain a pattern");
  });

  test("redirect rule cannot override existing regular link", async () => {
    // First create a regular link
    const { data: regularLink } = await http.post<Link>({
      path: "/links",
      body: {
        domain,
        key: "existing-link",
        url: "https://example.com/existing",
      },
    });

    onTestFinished(async () => {
      await h.deleteLink(regularLink.id);
    });

    // Try to create a redirect rule with the same key
    const { status, data } = await http.post({
      path: "/links",
      body: {
        domain,
        key: "existing-link",
        url: "https://example.com/:path",
        isRedirectRule: true,
      },
    });

    expect(status).toEqual(409);
    expect(data.error).toContain("already exists");
  });
});
