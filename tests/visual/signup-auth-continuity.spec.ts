import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { expectReadableTheme } from '../helpers/theme-contrast';

async function signupFixture(page: any, mode: string, theme: string, phoneEnabled = true) {
  const result = await build({ stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
    import React from 'react';import {createRoot} from 'react-dom/client';
    import {SignupView} from './apps/web/src/features/auth/SignupView';
    const place={label:'New York',latitude:40.7,longitude:-74,timeZone:'America/New_York'};
    const account={id:'synthetic-phone-owner',email:'',name:'',provider:'phone',phone:'+12125550100'};
    const form={fullName:'',email:'',password:'',birthDate:'1990-01-01',birthTime:'12:00 PM',unknownBirthTime:false,birthCity:place.label,birthLocation:place,currentLocation:place.label,currentLocationData:place};
    const h=window.signupHarness={sends:[],verifications:[],saved:[],result:null,verified:false,confirmations:0,resends:0};
    const root=createRoot(document.getElementById('root'));
    h.render=()=>root.render(<SignupView initialForm={form} initialMode=${JSON.stringify(mode)} hasPendingInvitation={true} initialAccount={h.verified?account:null}
      onAuthenticated={value=>h.result=value} onSavePendingForm={value=>h.saved.push(value)} onClearPendingForm={()=>{}} onClose={()=>{}} onEmailConfirmationRequired={()=>h.confirmations++}/>);
    h.render();
  ` }, bundle: true, write: false, format: 'iife', jsx: 'automatic', define: { 'import.meta.env': '{}' }, plugins: [{ name: 'isolated-auth', setup(b) {
    b.onResolve({ filter: /services\/auth$/ }, () => ({ path: 'auth', namespace: 'fixture' }));
    b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `
      export const isAuthConfigured=true,isPhoneAuthEnabled=${phoneEnabled};
      export async function sendPhoneSignInCode(number,options){window.signupHarness.sends.push({number,options});return '+12125550100';}
      export async function verifyPhoneSignInCode(value){const h=window.signupHarness;h.verifications.push(value);const account={id:'synthetic-phone-owner',email:'',name:'',provider:'phone',phone:value.phone};if(${JSON.stringify(mode)}==='create'){h.verified=true;queueMicrotask(h.render);}return account;}
      export async function signUpWithEmail(){return {account:{id:'unconfirmed'},sessionEstablished:false};}
      export async function signInWithEmail(){throw Object.assign(Error('Email not confirmed'),{code:'email_not_confirmed'});}
      export async function resendEmailSignupConfirmation(){window.signupHarness.resends++;}
      export async function signInWithProvider(){} export async function requestPasswordReset(){} export async function updateRecoveredPassword(){}
    ` }));
  } }] });
  const manifest = JSON.parse(readFileSync(`${process.env.PLAYWRIGHT_DIST_ROOT}/.vite/manifest.json`, 'utf8'));
  const css = new Set<string>([...Object.values(manifest).flatMap((entry: any) => entry.css ?? []), manifest['src/styles.css'].file]);
  await page.route('**/__signup-continuity', (route: any) => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html data-theme="${theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1">${[...css].map(file => `<link rel="stylesheet" href="/${file}">`).join('')}</head><body><div id="root"></div><script>${result.outputFiles[0].text}</script></body></html>` }));
  await page.goto('/__signup-continuity');
}

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) for (const mode of ['create', 'login']) {
  test(`auth access: New auth design preserves phone ${mode} ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await signupFixture(page, mode, theme);
    await page.getByRole('button', { name: 'Continue with phone', exact: true }).click();
    await page.getByRole('textbox', { name: 'US mobile number', exact: true }).fill('2125550100');
    await page.getByRole('button', { name: 'Send code', exact: true }).click();
    await expect(page.getByRole('textbox', { name: 'Six-digit verification code', exact: true })).toBeVisible();
    expect(await page.evaluate(() => (window as any).signupHarness.sends[0].options.shouldCreateUser)).toBe(mode === 'create');
    await expect(page.getByRole('button', { name: /Send a new code in/ })).toBeDisabled();
    await page.getByRole('button', { name: 'Verify code', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Enter the six-digit code.');
    expect(await page.evaluate(() => (window as any).signupHarness.verifications.length)).toBe(0);
    await page.getByRole('textbox', { name: 'Six-digit verification code', exact: true }).fill('123456');
    await expectReadableTheme(page, '.auth-field, .auth-primary-button, .auth-flow-text-button');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Verify code', exact: true }).click();
    if (mode === 'create') {
      await expect(page.getByRole('heading', { name: 'Your chart', exact: true })).toBeVisible();
      expect(await page.evaluate(() => (window as any).signupHarness.result)).toBeNull();
      expect(await page.evaluate(() => (window as any).signupHarness.saved[0].password)).toBe('');
      await page.getByRole('textbox', { name: 'Name', exact: true }).fill('Synthetic Reader');
      await page.getByRole('button', { name: 'Save chart', exact: true }).click();
    }
    await expect.poll(() => page.evaluate(() => (window as any).signupHarness.result?.provider)).toBe('phone');
    expect(await page.evaluate(() => (window as any).signupHarness.result.isNewAccount)).toBe(mode === 'create');
    expect(await page.evaluate(() => (window as any).signupHarness.verifications)).toEqual([{ phone: '+12125550100', code: '123456' }]);
  });
}

for (const mode of ['create', 'login']) test(`auth access: Email confirmation retains invitation without a session ${mode}`, async ({ page }) => {
  await signupFixture(page, mode, 'light', false);
  await expect(page.getByRole('button', { name: 'Continue with phone', exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('synthetic@example.test');
  await page.getByLabel('Password', { exact: true }).fill('synthetic-passphrase');
  await page.getByRole('button', { name: mode === 'create' ? 'Create an account' : 'Log in', exact: true }).first().click();
  await expect(page.getByLabel('Confirm your email', { exact: true })).toContainText('and friend invitation');
  await expect(page.getByLabel('Confirm your email', { exact: true })).toContainText('until your email is confirmed');
  expect(await page.evaluate(() => (window as any).signupHarness.result)).toBeNull();
  expect(await page.evaluate(() => (window as any).signupHarness.confirmations)).toBe(1);
  await page.getByRole('button', { name: 'Resend email', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('A new confirmation email was sent.');
});
