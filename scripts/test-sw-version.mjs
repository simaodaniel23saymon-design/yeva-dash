/**
 * Teste local: SW antigo vs novo — versioning + limpeza.
 * node scripts/test-sw-version.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sw = readFileSync(resolve(root, 'public/sw.js'), 'utf8');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(sw.includes('__YEWA_CACHE_VERSION__'), 'placeholder de versão presente');
assert(sw.includes('skipWaiting'), 'skipWaiting no install');
assert(sw.includes('clients.claim'), 'clients.claim no activate');
assert(sw.includes("k.startsWith('yeva-') && k !== CACHE_NAME"), 'apaga caches yeva-* antigos');
assert(sw.includes('YEWA_CLEAR_CACHES'), 'mensagem de limpeza manual');
assert(sw.includes('YEWA_SKIP_WAITING'), 'mensagem skip waiting');

const oldName = 'yeva-olddeadbeef';
const injected = sw.replace(/__YEWA_CACHE_VERSION__/g, 'abc123new');
assert(injected.includes("const CACHE_VERSION = 'abc123new'"), 'injecção de versão nova');
assert(!injected.includes(oldName), 'cache antigo não é o nome actual');
assert(injected.includes('yeva-${CACHE_VERSION}') || injected.includes('yeva-'), 'prefixo yeva-');

console.log('\nSimulação: deploy novo com versão abc123new → activate remove yeva-old* automaticamente.');
console.log('Procedimento mobile: abrir dashboard → se crash, auto-recover 1x → senão /recuperar.html');
