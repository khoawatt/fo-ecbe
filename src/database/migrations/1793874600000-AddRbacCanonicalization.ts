import type { MigrationInterface, QueryRunner } from 'typeorm';

type NonCanonicalReport = { affectedRows: number; rows: Array<Record<string, unknown>> };
type CollisionReport = { affectedGroups: number; affectedRows: number; groups: Array<Record<string, unknown>> };

const count = (value: unknown): number => Number(value ?? 0);

export class AddRbacCanonicalization1793874600000 implements MigrationInterface {
  name = 'AddRbacCanonicalization1793874600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Lock out concurrent writes while the read-only preflight and DDL run in this transaction.
    await queryRunner.query('LOCK TABLE roles, permissions IN SHARE MODE');

    const [roleCodeNonCanonical] = await queryRunner.query(
      "SELECT COUNT(*)::int AS \"affectedRows\", COALESCE(jsonb_agg(jsonb_build_object('id', id, 'storedValue', code, 'canonicalValue', upper(btrim(code))) ORDER BY code, id), '[]'::jsonb) AS rows FROM roles WHERE code <> upper(btrim(code))"
    ) as [NonCanonicalReport];
    const [permissionCodeNonCanonical] = await queryRunner.query(
      "SELECT COUNT(*)::int AS \"affectedRows\", COALESCE(jsonb_agg(jsonb_build_object('id', id, 'storedValue', code, 'canonicalValue', lower(btrim(code))) ORDER BY code, id), '[]'::jsonb) AS rows FROM permissions WHERE code <> lower(btrim(code))"
    ) as [NonCanonicalReport];

    const [roleCodeCollisions] = await queryRunner.query(
      "SELECT COUNT(*)::int AS \"affectedGroups\", COALESCE(SUM(\"rowCount\"), 0)::int AS \"affectedRows\", COALESCE(jsonb_agg(jsonb_build_object('canonicalValue', \"canonicalValue\", 'rowCount', \"rowCount\", 'rows', details) ORDER BY \"canonicalValue\"), '[]'::jsonb) AS groups FROM (SELECT upper(btrim(code)) AS \"canonicalValue\", COUNT(*)::int AS \"rowCount\", jsonb_agg(jsonb_build_object('id', id, 'storedValue', code) ORDER BY code, id) AS details FROM roles GROUP BY upper(btrim(code)) HAVING COUNT(*) > 1) collisions"
    ) as [CollisionReport];
    const [permissionCodeCollisions] = await queryRunner.query(
      "SELECT COUNT(*)::int AS \"affectedGroups\", COALESCE(SUM(\"rowCount\"), 0)::int AS \"affectedRows\", COALESCE(jsonb_agg(jsonb_build_object('canonicalValue', \"canonicalValue\", 'rowCount', \"rowCount\", 'rows', details) ORDER BY \"canonicalValue\"), '[]'::jsonb) AS groups FROM (SELECT lower(btrim(code)) AS \"canonicalValue\", COUNT(*)::int AS \"rowCount\", jsonb_agg(jsonb_build_object('id', id, 'storedValue', code) ORDER BY code, id) AS details FROM permissions GROUP BY lower(btrim(code)) HAVING COUNT(*) > 1) collisions"
    ) as [CollisionReport];
    const [roleNameCollisions] = await queryRunner.query(
      "SELECT COUNT(*)::int AS \"affectedGroups\", COALESCE(SUM(\"rowCount\"), 0)::int AS \"affectedRows\", COALESCE(jsonb_agg(jsonb_build_object('canonicalValue', \"canonicalValue\", 'rowCount', \"rowCount\", 'rows', details) ORDER BY \"canonicalValue\"), '[]'::jsonb) AS groups FROM (SELECT lower(btrim(name)) AS \"canonicalValue\", COUNT(*)::int AS \"rowCount\", jsonb_agg(jsonb_build_object('id', id, 'storedValue', name) ORDER BY name, id) AS details FROM roles GROUP BY lower(btrim(name)) HAVING COUNT(*) > 1) collisions"
    ) as [CollisionReport];

    const findings = {
      'roles.code.nonCanonical': {
        affectedRows: count(roleCodeNonCanonical.affectedRows),
        rows: roleCodeNonCanonical.rows,
      },
      'permissions.code.nonCanonical': {
        affectedRows: count(permissionCodeNonCanonical.affectedRows),
        rows: permissionCodeNonCanonical.rows,
      },
      'roles.code.canonicalCollisions': {
        affectedGroups: count(roleCodeCollisions.affectedGroups),
        affectedRows: count(roleCodeCollisions.affectedRows),
        groups: roleCodeCollisions.groups,
      },
      'permissions.code.canonicalCollisions': {
        affectedGroups: count(permissionCodeCollisions.affectedGroups),
        affectedRows: count(permissionCodeCollisions.affectedRows),
        groups: permissionCodeCollisions.groups,
      },
      'roles.name.canonicalCollisions': {
        affectedGroups: count(roleNameCollisions.affectedGroups),
        affectedRows: count(roleNameCollisions.affectedRows),
        groups: roleNameCollisions.groups,
      },
    };

    const hasConflicts =
      findings['roles.code.nonCanonical'].affectedRows > 0 ||
      findings['permissions.code.nonCanonical'].affectedRows > 0 ||
      findings['roles.code.canonicalCollisions'].affectedGroups > 0 ||
      findings['permissions.code.canonicalCollisions'].affectedGroups > 0 ||
      findings['roles.name.canonicalCollisions'].affectedGroups > 0;

    if (hasConflicts) {
      throw new Error([
        'RBAC canonicalization migration aborted: existing data violates the approved canonical policy.',
        'No rows were changed and no schema objects were created.',
        'Resolve the reported conflicts only after explicit Tech Lead approval, then rerun the migration.',
        'Read-only preflight findings:',
        JSON.stringify(findings, null, 2),
      ].join('\n\n'));
    }

    await queryRunner.query(
      'ALTER TABLE roles ADD CONSTRAINT ck_roles_code_canonical CHECK (code = upper(btrim(code)))'
    );
    await queryRunner.query(
      'ALTER TABLE permissions ADD CONSTRAINT ck_permissions_code_canonical CHECK (code = lower(btrim(code)))'
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX uq_roles_name_canonical ON roles (lower(btrim(name)))'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX uq_roles_name_canonical');
    await queryRunner.query(
      'ALTER TABLE permissions DROP CONSTRAINT ck_permissions_code_canonical'
    );
    await queryRunner.query(
      'ALTER TABLE roles DROP CONSTRAINT ck_roles_code_canonical'
    );
  }
}
