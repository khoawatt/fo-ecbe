export interface PermissionRepositoryInterface {
  findCodesForRoles(roleCodes: string[]): Promise<string[]>;
}
