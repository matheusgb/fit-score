import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { JobSchema, ProfileSchema, RubricSchema, type Job, type Profile, type Rubric } from '../src/core/index.js';

const root = new URL('../', import.meta.url);

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(new URL(path, root), 'utf8'));
}

export function loadRubric(): Rubric {
  return RubricSchema.parse(parse(readFileSync(new URL('rubric/default.yaml', root), 'utf8')));
}

export function loadProfile(): Profile {
  return ProfileSchema.parse(readJson('fixtures/profile.example.json'));
}

export function loadJob(name: 'fullstack' | 'backend-go' | 'front-presencial'): Job {
  return JobSchema.parse(readJson(`fixtures/job-${name}.example.json`));
}

export function baseProfile(overrides: Partial<Profile> = {}): Profile {
  return { skills: [], seniority: 'senior', modalities: ['remote'], languages: [], ...overrides };
}

export function baseJob(overrides: Partial<Job> = {}): Job {
  return {
    title: 'Vaga de teste',
    description: '',
    required: [],
    desired: [],
    seniority: 'senior',
    modality: 'remote',
    languages: [],
    ...overrides,
  };
}
