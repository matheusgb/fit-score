import { expect, test } from '@playwright/test';

test('pontua a vaga de exemplo e explica cada critério', async ({ page }) => {
  await page.goto('/');

  // A primeira vaga em ordem alfabética é "backend-go": nota 67.
  await expect(page.getByLabel('Vaga de exemplo')).toBeVisible();
  await page.getByRole('button', { name: 'Pontuar' }).click();
  await expect(page.getByTestId('total')).toContainText('67');

  const required = page.getByTestId('criterion-required-skills');
  await expect(required).toContainText('1 de 3 itens atendidos');
  await expect(required).toContainText('A base de código é em Go.');
  await expect(page.getByTestId('criterion-modality')).toContainText('10 de 10 pontos');

  // Trocar de vaga muda a nota.
  await page.getByLabel('Vaga de exemplo').selectOption({ label: 'Pessoa Desenvolvedora Fullstack Sênior (Empresa Exemplo A)' });
  await page.getByRole('button', { name: 'Pontuar' }).click();
  await expect(page.getByTestId('total')).toContainText('87');
});

test('mostra erro claro quando o JSON da vaga é inválido', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Vaga de exemplo')).toBeVisible();

  await page.getByLabel('Vaga (JSON)').fill('{ isto não é json');
  await page.getByRole('button', { name: 'Pontuar' }).click();

  await expect(page.getByRole('alert')).toContainText('A vaga não é um JSON válido.');
  await expect(page.getByTestId('total')).toHaveCount(0);
});

test('mostra o campo inválido quando a API rejeita os dados', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByLabel('Vaga de exemplo')).toBeVisible();

  await page.getByLabel('Perfil (JSON)').fill('{"skills": [], "seniority": "guru", "modalities": ["remote"], "languages": []}');
  await page.getByRole('button', { name: 'Pontuar' }).click();

  await expect(page.getByRole('alert')).toContainText('profile.seniority');
});
