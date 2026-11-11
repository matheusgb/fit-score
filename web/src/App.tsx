import { useEffect, useState, type CSSProperties } from 'react';
import type { CriterionResult, ScoreResult } from '../../src/core/schema';
import { ApiError, fetchExamples, score, type ApiIssue, type Examples } from './api';

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

function points(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function CriterionRow({ result }: { result: CriterionResult }) {
  return (
    <li className="criterion" data-testid={`criterion-${result.id}`}>
      <div className="criterion-head">
        <strong>{result.label}</strong>
        <span>{result.applicable ? `${points(result.points)} de ${result.weight} pontos` : 'fora da nota'}</span>
      </div>
      {result.applicable && result.weight > 0 && (
        <div className="bar" aria-hidden="true">
          <span style={{ width: `${Math.min(100, (result.points / result.weight) * 100)}%` }} />
        </div>
      )}
      <p>{result.reason}</p>
      {result.items.length > 0 && (
        <ul className="items">
          {result.items.map((item) => (
            <li key={item.name} className={item.met ? 'met' : 'missing'}>
              <span aria-hidden="true">{item.met ? '✓' : '✗'}</span> {item.name}
              <span className="sr-only">{item.met ? ' (atendido)' : ' (não atendido)'}</span>
              {item.evidence !== undefined ? (
                <blockquote>{item.evidence}</blockquote>
              ) : (
                <em className="no-evidence"> (a descrição da vaga não cita este item)</em>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function Result({ result }: { result: ScoreResult }) {
  return (
    <section aria-labelledby="result-title">
      <h2 id="result-title">Resultado</h2>
      <div className="hero">
        <div className="ring" style={{ '--pct': result.total } as CSSProperties}>
          <div className="ring-inner">
            <p className="total" data-testid="total">
              <span className="sr-only">Nota: </span>
              <strong>{result.total}</strong>
              <small>de 100</small>
            </p>
          </div>
        </div>
        <p className="muted">
          {points(result.earnedPoints)} de {points(result.maxPoints)} pontos possíveis (rubrica v{result.rubricVersion}).
        </p>
      </div>
      <ul className="criteria">
        {result.criteria.map((criterion) => (
          <CriterionRow key={criterion.id} result={criterion} />
        ))}
      </ul>
    </section>
  );
}

export function App() {
  const [examples, setExamples] = useState<Examples | null>(null);
  const [profileText, setProfileText] = useState('');
  const [jobText, setJobText] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<ApiIssue[]>([]);
  const [inputsOpen, setInputsOpen] = useState(true);

  useEffect(() => {
    fetchExamples()
      .then((loaded) => {
        setExamples(loaded);
        setProfileText(pretty(loaded.profile));
        const first = loaded.jobs[0];
        if (first !== undefined) {
          setSelectedJob(first.id);
          setJobText(pretty(first.job));
        }
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Falha ao carregar exemplos.'));
  }, []);

  function chooseJob(id: string) {
    setSelectedJob(id);
    const found = examples?.jobs.find((item) => item.id === id);
    if (found !== undefined) setJobText(pretty(found.job));
  }

  async function run() {
    setError(null);
    setIssues([]);
    setResult(null);
    let profile: unknown;
    let job: unknown;
    try {
      profile = JSON.parse(profileText);
    } catch {
      setError('O perfil não é um JSON válido.');
      return;
    }
    try {
      job = JSON.parse(jobText);
    } catch {
      setError('A vaga não é um JSON válido.');
      return;
    }
    try {
      setResult(await score(profile, job));
      setInputsOpen(false);
    } catch (cause) {
      if (cause instanceof ApiError) {
        setError(cause.message);
        setIssues(cause.issues);
      } else {
        setError('Falha inesperada ao pontuar.');
      }
    }
  }

  return (
    <main>
      <h1>fit-score</h1>
      <p className="muted">
        Pontua a adesão de uma vaga a um perfil por critérios de uma rubrica e explica cada ponto. Os dados abaixo são
        exemplos sintéticos.
      </p>

      <div className="controls">
        <div>
          <label htmlFor="job-example">Vaga de exemplo</label>
          <select id="job-example" value={selectedJob} onChange={(event) => chooseJob(event.target.value)}>
            {examples?.jobs.map((item) => (
              <option key={item.id} value={item.id}>
                {item.job.title} ({item.job.company ?? 'sem empresa'})
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => void run()} disabled={examples === null}>
          Pontuar
        </button>
      </div>

      <details className="inputs" open={inputsOpen} onToggle={(event) => setInputsOpen(event.currentTarget.open)}>
        <summary>Editar vaga e perfil (JSON)</summary>
        <div className="grid">
          <div>
            <label htmlFor="job-json">Vaga (JSON)</label>
            <textarea id="job-json" value={jobText} onChange={(event) => setJobText(event.target.value)} rows={18} />
          </div>
          <div>
            <label htmlFor="profile-json">Perfil (JSON)</label>
            <textarea
              id="profile-json"
              value={profileText}
              onChange={(event) => setProfileText(event.target.value)}
              rows={18}
            />
          </div>
        </div>
      </details>

      {error !== null && (
        <div role="alert" className="error">
          <p>{error}</p>
          {issues.length > 0 && (
            <ul>
              {issues.map((issue) => (
                <li key={`${issue.path}-${issue.message}`}>
                  <code>{issue.path}</code>: {issue.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result !== null && <Result result={result} />}
    </main>
  );
}
