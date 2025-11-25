# Redirect Rules Feature - Testing Guide

## Implementation Summary

The redirect rules feature has been implemented with the following components:

### 1. Database Schema Changes
- Added `isRedirectRule` (boolean) field to Link model
- Added `redirectPattern` (string) field to Link model  
- Added index on `[domain, isRedirectRule]` for efficient queries

**⚠️ IMPORTANT**: You need to run a database migration to add these fields:
```sql
ALTER TABLE Link ADD COLUMN isRedirectRule BOOLEAN DEFAULT FALSE;
ALTER TABLE Link ADD COLUMN redirectPattern VARCHAR(500) NULL;
CREATE INDEX idx_domain_isRedirectRule ON Link(domain, isRedirectRule);
```

### 2. Pattern Matching Logic
Located in: `apps/web/lib/planetscale/get-redirect-rule-via-edge.ts`

Supports patterns:
- `*` wildcards: `introduction-deck/*` matches `introduction-deck/clientA`, `introduction-deck/clientB`, etc.
- `:path` placeholders: `:path` matches any path, `prefix/:path` matches paths starting with prefix
- Rules are ordered by specificity (longer patterns checked first)

### 3. Middleware Integration
Located in: `apps/web/lib/middleware/link.ts`

- Checks redirect rules when direct link lookup fails
- Resolves destination URLs by replacing placeholders
- Tracks clicks with child key (actual accessed path) for analytics

### 4. API Support
- Added `isRedirectRule` and `redirectPattern` to link creation/update schemas
- Validation prevents redirect rules from overriding existing regular links
- Redirect rules skip normal key validation (they use patterns)

## Testing Checklist

### ✅ Unit Tests Needed

1. **Pattern Matching Tests**
   - [ ] Wildcard pattern `introduction-deck/*` matches `introduction-deck/clientA`
   - [ ] Wildcard pattern `introduction-deck/*` matches `introduction-deck` (exact match)
   - [ ] `:path` pattern matches any path
   - [ ] `prefix/:path` pattern matches `prefix/value`
   - [ ] Non-matching paths return null

2. **URL Resolution Tests**
   - [ ] `https://domain.com/introduction-deck/:path` + `clientA` → `https://domain.com/introduction-deck/clientA`
   - [ ] `https://domain.com/:path` + `test` → `https://domain.com/test`
   - [ ] Multiple `:path` placeholders are replaced correctly

3. **API Tests**
   - [ ] Create redirect rule with valid pattern
   - [ ] Create redirect rule with invalid pattern (should fail)
   - [ ] Redirect rule cannot override existing regular link
   - [ ] Update existing redirect rule

4. **Middleware Tests**
   - [ ] Direct link takes precedence over redirect rule
   - [ ] Redirect rule matches and redirects correctly
   - [ ] Click tracking uses child key
   - [ ] Analytics show correct path

### 🔍 Manual Testing Steps

1. **Create a Redirect Rule via API:**
```bash
curl -X POST https://api.dub.co/links \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "your-domain.com",
    "key": "introduction-deck/*",
    "url": "https://example.com/introduction-deck/:path",
    "isRedirectRule": true
  }'
```

2. **Test Redirect:**
```bash
# Visit: https://your-domain.com/introduction-deck/clientA
# Should redirect to: https://example.com/introduction-deck/clientA
```

3. **Verify Analytics:**
- Check that clicks are tracked with key `introduction-deck/clientA`
- Verify the redirect rule link shows aggregated stats

## Known Issues & Limitations

1. **Database Migration Required**: The Prisma schema changes need to be migrated to the database
2. **Pattern Validation**: Currently validates that patterns contain `*` or `:path`, but could be more strict
3. **Performance**: Queries all redirect rules for a domain - could be optimized with better caching
4. **UI Support**: No UI components yet - redirect rules must be created via API

## Files Modified

1. `packages/prisma/schema/link.prisma` - Added redirect rule fields
2. `apps/web/lib/planetscale/get-redirect-rule-via-edge.ts` - Pattern matching logic (NEW)
3. `apps/web/lib/middleware/link.ts` - Middleware integration
4. `apps/web/lib/api/links/process-link.ts` - Validation logic
5. `apps/web/lib/zod/schemas/links.ts` - API schema updates
6. `apps/web/lib/planetscale/types.ts` - Type definitions
7. `apps/web/tests/links/redirect-rules.test.ts` - Test file (NEW)

## Next Steps

1. Run database migration
2. Run unit tests: `pnpm test apps/web/tests/links/redirect-rules.test.ts`
3. Test manually via API
4. Monitor for any edge cases or performance issues
5. Add UI components for managing redirect rules
