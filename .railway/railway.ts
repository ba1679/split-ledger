import { defineRailway, project, service } from 'railway/iac';

// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = 'app';

export default defineRailway(() => {
  const app = service('app', {
    build: {
      buildCommand: 'pnpm install --frozen-lockfile && pnpm build',
      buildEnvironment: 'V3',
      builder: 'RAILPACK',
    },
    start: 'node apps/api/dist/server.js',
    healthcheck: '/healthz',
    healthcheckTimeout: 120,
    deploy: {
      // Railway stores its ON_FAILURE default as null; avoid perpetual plan drift.
      restartPolicyType: null,
      restartPolicyMaxRetries: 3,
    },
    replicas: { sfo: 1 },
  });

  // The CLI supports variable policy; SDK 3.16.0 omits it from project option types.
  const configuration = {
    variables: { managed: false },
    resources: [app],
  };

  return project('split-ledger-trial', configuration);
});
