import {cp,mkdir,access} from "node:fs/promises";
async function copyOrKeep(source,destination,check,options={}){
 try{await access(source);}catch(error){if(error.code!=="ENOENT")throw error;await access(check);return;}
 await cp(source,destination,options);
}
for(const name of ["weather","recipe","blog","misc"]){await mkdir(`public/d/${name}`,{recursive:true});await copyOrKeep(`../DisguiseSites/${name}`,`public/d/${name}`,`public/d/${name}/index.html`,{recursive:true});}
await mkdir("public/fonts",{recursive:true});
for(const name of ["NotoSansDevanagari.ttf","OFL.txt"])await copyOrKeep(`../Backend/assets/${name}`,`public/fonts/${name}`,`public/fonts/${name}`);
console.log("Neutral pages and local fonts ready.");
