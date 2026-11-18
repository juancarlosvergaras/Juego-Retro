const fs=require('node:fs');
eval(fs.readFileSync('server.cjs','utf8').replace('const root=__dirname','const root=process.cwd()').replaceAll('4173','4186'));
