// Same Debian URL, different User-Agents. Run it inside node:24-bookworm-slim.
const url = 'http://deb.debian.org/debian/dists/bookworm/InRelease';
const agents = {
  'node default': undefined,
  'apt default': 'Debian APT-HTTP/1.3 (2.6.1)',
  'Mozilla/5.0': 'Mozilla/5.0',
};

for (const [label, ua] of Object.entries(agents)) {
  try {
    const res = await fetch(url, { headers: ua ? { 'User-Agent': ua } : {}, signal: AbortSignal.timeout(8000) });
    console.log(`${label.padEnd(13)} -> HTTP ${res.status}`);
  } catch (err) {
    console.log(`${label.padEnd(13)} -> failed (${err.cause?.code ?? err.name})`);
  }
}
