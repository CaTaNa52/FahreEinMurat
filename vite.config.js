import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

// Zero-dependency precache injection: includes every hashed Vite chunk (including
// lazily loaded game/studio chunks) so the installed game remains usable offline.
function pwaPrecache(){
  return {name:'murat-offline-precache',apply:'build',async writeBundle(options,bundle){
    const output=join(options.dir??'dist','sw.js');
    const source=await readFile(output,'utf8');
    const assets=['/','/index.html','/manifest.webmanifest',
      '/icons/icon-192.png','/icons/icon-512.png','/icons/icon-maskable-512.png',
      '/icons/apple-touch-icon.png',
      ...Object.keys(bundle).filter(path=>path!=='sw.js').map(path=>'/'+path)];
    const unique=[...new Set(assets)];
    const hash=createHash('sha256').update(JSON.stringify(unique)).digest('hex').slice(0,12);
    await writeFile(output,source
      .replace("'__PRECACHE_MANIFEST__'",JSON.stringify(unique))
      .replace("'__PRECACHE_VERSION__'",JSON.stringify(hash)));
  }};
}
export default defineConfig({
  plugins:[react(),pwaPrecache()],
  server:{host:'0.0.0.0',port:5173,strictPort:true},
  build:{target:'es2022'}
});
