-- FO-003A Task 02: read-only RBAC canonicalization preflight.
-- Run against the representative PostgreSQL database before applying the migration.
-- This script is deliberately read-only and does not rewrite or delete identities.
-- btrim(value) with no character-set argument trims ordinary leading/trailing spaces;
-- it does not normalize tabs, newlines, or every Unicode whitespace character.

BEGIN TRANSACTION READ ONLY;

-- 1. Role.code values that are not already uppercase and space-trimmed.
SELECT
  COUNT(*)::int AS affected_rows,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'stored_value', code,
        'canonical_value', upper(btrim(code))
      ) ORDER BY code, id
    ),
    '[]'::jsonb
  ) AS affected_values
FROM public.roles
WHERE code <> upper(btrim(code));

-- 2. Permission.code values that are not already lowercase and space-trimmed.
SELECT
  COUNT(*)::int AS affected_rows,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'stored_value', code,
        'canonical_value', lower(btrim(code))
      ) ORDER BY code, id
    ),
    '[]'::jsonb
  ) AS affected_values
FROM public.permissions
WHERE code <> lower(btrim(code));

-- 3. Role.name collisions under lower(btrim(name)); stored display casing is retained.
SELECT
  lower(btrim(name)) AS canonical_name,
  COUNT(*)::int AS row_count,
  jsonb_agg(
    jsonb_build_object('id', id, 'stored_name', name)
    ORDER BY name, id
  ) AS conflicting_rows
FROM public.roles
GROUP BY lower(btrim(name))
HAVING COUNT(*) > 1
ORDER BY canonical_name;

-- 4. Role.code collisions under upper(btrim(code)).
SELECT
  upper(btrim(code)) AS canonical_code,
  COUNT(*)::int AS row_count,
  jsonb_agg(
    jsonb_build_object('id', id, 'stored_code', code)
    ORDER BY code, id
  ) AS conflicting_rows
FROM public.roles
GROUP BY upper(btrim(code))
HAVING COUNT(*) > 1
ORDER BY canonical_code;

-- 5. Permission.code collisions under lower(btrim(code)).
SELECT
  lower(btrim(code)) AS canonical_code,
  COUNT(*)::int AS row_count,
  jsonb_agg(
    jsonb_build_object('id', id, 'stored_code', code)
    ORDER BY code, id
  ) AS conflicting_rows
FROM public.permissions
GROUP BY lower(btrim(code))
HAVING COUNT(*) > 1
ORDER BY canonical_code;

COMMIT;
