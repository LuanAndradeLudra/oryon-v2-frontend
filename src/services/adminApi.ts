// ─── Admin API (Oryon staff) ───────────────────────────────────────────────
// Cross-tenant operations restricted to super_admin in the backend. Lives in
// its own file to keep the surface obvious — anything imported from here
// implies an Oryon-staff context.

import { api } from './api'

export interface AdminOrganization {
  id: string
  businessName: string
}

/** Lists every customer organisation. Backend returns only id + name so
 *  sensitive fields don't leak into the admin tooling. */
export async function listAdminOrganizations(): Promise<AdminOrganization[]> {
  const res = await api.get<AdminOrganization[]>('/organizations/admin/list')
  return res.data
}
