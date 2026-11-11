import type { Job, Profile, ScoreResult } from '../../src/core/schema';

export interface Examples {
  profile: Profile;
  jobs: { id: string; job: Job }[];
}

export interface ApiIssue {
  path: string;
  message: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly issues: ApiIssue[] = [],
  ) {
    super(message);
  }
}

export async function fetchExamples(): Promise<Examples> {
  const response = await fetch('/api/examples');
  if (!response.ok) throw new ApiError(`Falha ao carregar exemplos (HTTP ${response.status}).`);
  return (await response.json()) as Examples;
}

export async function score(profile: unknown, job: unknown): Promise<ScoreResult> {
  const response = await fetch('/api/score', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ profile, job }),
  });
  if (response.status === 400) {
    const body = (await response.json()) as { issues?: ApiIssue[] };
    throw new ApiError('Os dados enviados são inválidos.', body.issues ?? []);
  }
  if (!response.ok) throw new ApiError(`Falha ao pontuar (HTTP ${response.status}).`);
  return (await response.json()) as ScoreResult;
}
