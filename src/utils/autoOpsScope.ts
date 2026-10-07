import type { AutoOpsModule, AutoOpsStatusResponse, AutoOpsUserModule } from '../types/autoOps';

export type AutoOpsView =
  | { restricted: false; adminModules: AutoOpsModule[]; marketModules: [] }
  | { restricted: true; adminModules: []; marketModules: AutoOpsUserModule[] };

/** Só trata como laboratório Paper quando o backend diz PAPER_ADMIN; tudo o resto é vista restrita. */
export function splitAutoOpsStatus(data: AutoOpsStatusResponse | null | undefined): AutoOpsView {
  if (data?.scope === 'PAPER_ADMIN') return { restricted: false, adminModules: data.modules ?? [], marketModules: [] };
  const modules = data && 'modules' in data ? (data.modules as AutoOpsUserModule[]) : [];
  return { restricted: true, adminModules: [], marketModules: modules };
}
