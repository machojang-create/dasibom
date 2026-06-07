const fs = require('fs');
const text = fs.readFileSync('C:/Users/note/Desktop/memoir/game.html', 'utf8');
const scriptStart = text.indexOf('<script>');
const scriptEnd = text.lastIndexOf('</script>');
const js = text.slice(scriptStart+8, scriptEnd);

let inSingle = false, inDouble = false, inLineComment = false, inBlockComment = false;
let lastOpenPos = -1;
let errors = [];

for(let i=0; i<js.length && errors.length < 15; i++){
  const c = js[i], n = js[i+1];
  if(inLineComment){ if(c==='\n') inLineComment=false; continue; }
  if(inBlockComment){ if(c==='*'&&n==='/'){inBlockComment=false;i++;} continue; }
  if(!inSingle && !inDouble){
    if(c==='/'&&n==='/'){inLineComment=true;i++;continue;}
    if(c==='/'&&n==='*'){inBlockComment=true;i++;continue;}
    if(c==="'"){inSingle=true;lastOpenPos=i;continue;}
    if(c==='"'){inDouble=true;lastOpenPos=i;continue;}
  } else if(inSingle){
    if(c==='\\'){i++;continue;}
    if(c==="'"){inSingle=false;continue;}
    if(c==='\n'){
      const lineNum = js.slice(0,lastOpenPos).split('\n').length;
      errors.push('Line '+lineNum+': '+JSON.stringify(js.slice(lastOpenPos, Math.min(lastOpenPos+120,js.length))));
      inSingle=false;
    }
  } else if(inDouble){
    if(c==='\\'){i++;continue;}
    if(c==='"'){inDouble=false;continue;}
    if(c==='\n'){
      const lineNum = js.slice(0,lastOpenPos).split('\n').length;
      errors.push('Line '+lineNum+': '+JSON.stringify(js.slice(lastOpenPos, Math.min(lastOpenPos+120,js.length))));
      inDouble=false;
    }
  }
}
console.log('Unclosed strings:', errors.length);
errors.forEach(e => console.log(e));
