import fs from 'fs';

const html = fs.readFileSync('C:\\Users\\note\\Downloads\\_ _Standalone_.html', 'utf-8');
const tmplMatch = html.match(/<script type="__bundler\/template">([\s\S]*?)<\/script>/);
if (tmplMatch) {
  const template = JSON.parse(tmplMatch[1]);
  const clean = template.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, 'ASSET');
  fs.writeFileSync('C:\\Users\\note\\Desktop\\memoir\\extracted_template.html', clean);
  console.log('Template extracted, size:', clean.length);
} else {
  console.log('No template tag found');
  // Check what script types exist
  const types = [...html.matchAll(/<script type="([^"]+)"/g)].map(m => m[1]);
  console.log('Script types found:', [...new Set(types)]);
}
