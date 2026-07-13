import { resolve } from 'node:path';
import { FileRepository } from '../server/repository.mjs';
import { PRIVACY_VERSION, QUESTIONNAIRE_VERSION, validateQuestionnaire } from '../server/questionnaire.mjs';
import { sha256 } from '../server/security.mjs';

const repository = new FileRepository(process.env.ZAC_STORE_PATH || resolve('.data/dev-store.json'));
const baseAnswers={obiettivo:'Aumentare massa muscolare',esperienza:'6 mesi - 2 anni',frequenza:'3-4',alimentazione:'Più o meno',disciplina:'7',costanza:'1 volta',consapevolezza:'Spesso',tecnica:'Buona',ostacolo:'Programmazione'};
const samples=[
  ['Andrea','Conti','andrea@example.com',26,{esperienza:'Meno di 6 mesi',frequenza:'1-2',disciplina:'5',tecnica:'Sufficiente'},'Perdere grasso'],
  ['Giulia','Romano','giulia@example.com',31,{disciplina:'9',costanza:'Mai'},'Ricomposizione corporea'],
  ['Davide','Esposito','davide@example.com',38,{esperienza:'Più di 5 anni',frequenza:'5+',alimentazione:'Sì',disciplina:'10',costanza:'Mai',consapevolezza:'Sempre',tecnica:'Ottima'},'Aumentare massa muscolare'],
  ['Martina','Ferrari','martina@example.com',29,{esperienza:'2 - 5 anni',frequenza:'3-4',alimentazione:'Sì',disciplina:'8',costanza:'Mai',consapevolezza:'Sempre',tecnica:'Buona'},'Migliorare la forma fisica generale'],
];
for(const [firstName,lastName,email,age,changes,goal] of samples){
  const key=`demo-${email.replace(/[^a-z]/g,'')}`;
  const payload=validateQuestionnaire({questionnaireVersion:QUESTIONNAIRE_VERSION,privacyVersion:PRIVACY_VERSION,privacyAccepted:true,marketingConsent:true,startedAt:Date.now()-10_000,firstName,lastName,email,age,gender:firstName==='Giulia'||firstName==='Martina'?'Donna':'Uomo',answers:{...baseAnswers,...changes,obiettivo:goal},improvementGoal:'Costruire un fisico più forte, proporzionato e sostenibile.',motivation:'Voglio vedere finalmente una progressione chiara e smettere di allenarmi a caso.'});
  await repository.saveSubmission(payload,{idempotencyKey:key,deliveryTokenHash:sha256(key),ipHash:null});
}
await repository.saveWaitlist({name:'Luca Bianchi',email:'luca@example.com',goal:'Perdere grasso',marketingConsent:false,privacyVersion:PRIVACY_VERSION,source:'landing',utm:{}},{ipHash:null});
await repository.saveWaitlist({name:'Sara De Luca',email:'sara@example.com',goal:'Aumentare massa muscolare',marketingConsent:true,privacyVersion:PRIVACY_VERSION,source:'instagram',utm:{source:'instagram'}},{ipHash:null});
console.log('Dati demo inseriti in .data/dev-store.json');
