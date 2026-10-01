'use strict';
// Explicit regeneration only. Fixtures are committed so native tests also catch
// later accidental changes to either runtime's rules. Not run by the test suite.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const Rules=require('../browser/rules.js');
const cases=[];
for(let seed=1;seed<=10;seed++){
 const r=new Rules(seed),steps=[];let controls=seed*197;
 const pick=n=>{controls=(Math.imul(controls,1664525)+1013904223)>>>0;return controls%n;};
 for(let k=0;k<30;k++){
  const spec=r.nextSpec(),rotation=pick(4);let cells=r.shape(spec.shape);
  for(let j=0;j<rotation;j++)cells=r.rotate(cells);
  const x=pick(9-r.width(cells)),origin=r.landing(cells,[x,-3]);
  const out=r.commit(cells,origin,spec.color);
  steps.push({...spec,rotation,x,y:origin[1],keep:out.keep,reason:out.reason,contacts:out.contacts,filled:r.fillCount()});
 }
 cases.push({seed,steps});
}
fs.writeFileSync(path.join(root,'tests/reference_fixtures.json'),JSON.stringify({source:'Frozen browser rules reference; regenerate deliberately',cases},null,2)+'\n');
const translations=JSON.parse(fs.readFileSync(path.join(root,'data/english_ui.json'),'utf8'));
fs.writeFileSync(path.join(root,'tests/native_translation_cases.json'),JSON.stringify(Object.keys(translations),null,2)+'\n');
