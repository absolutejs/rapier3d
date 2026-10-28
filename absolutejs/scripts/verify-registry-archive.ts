/** Verify registry metadata and downloaded bytes against an already audited archive. */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const [auditPath, archivePath, output] = process.argv.slice(2);
if (!auditPath || !archivePath || !output) throw Error('Expected archive audit, archive and receipt paths');
const audit = JSON.parse(readFileSync(auditPath, 'utf8'));
if (audit.auditScope !== 'release') throw Error('Only an audited public release may be verified');
const archive = readFileSync(archivePath);
const sha = (data: Uint8Array, algorithm: string, encoding: 'hex' | 'base64' = 'hex') =>
  createHash(algorithm).update(data).digest(encoding);
if (sha(archive, 'sha256') !== audit.tarballSha256) throw Error('Local archive changed after audit');
const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(audit.name)}/${encodeURIComponent(audit.version)}?cacheBust=${Date.now()}`, {
  headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(20000),
});
const receipt: Record<string, unknown> = { package: audit.name, version: audit.version, checkedAt: new Date().toISOString(), registryStatus: response.status };
if (!response.ok) {
  writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  throw Error(`Registry not available yet: ${response.status}; do not republish an accepted version`);
}
const metadata = await response.json() as { name: string; version: string; dist: { integrity: string; shasum: string; tarball: string } };
if (metadata.name !== audit.name || metadata.version !== audit.version || metadata.dist.shasum !== audit.shasum || metadata.dist.integrity !== audit.integrity)
  throw Error('Registry metadata differs from audited release');
const url = new URL(metadata.dist.tarball);
if (url.protocol !== 'https:' || url.hostname !== 'registry.npmjs.org') throw Error('Unexpected registry archive host');
const tarball = await fetch(url, { signal: AbortSignal.timeout(20000) });
if (!tarball.ok) throw Error(`Archive download failed: ${tarball.status}`);
const bytes = new Uint8Array(await tarball.arrayBuffer());
if (sha(bytes, 'sha256') !== audit.tarballSha256 || sha(bytes, 'sha1') !== audit.shasum || `sha512-${sha(bytes, 'sha512', 'base64')}` !== audit.integrity)
  throw Error('Downloaded archive differs from audited release');
Object.assign(receipt, { dist: metadata.dist, archiveSha256: audit.tarballSha256, archiveBytes: bytes.length, registryMatchesAuditedArchive: true, downloadedArchiveVerified: true });
writeFileSync(output, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(receipt, null, 2));
