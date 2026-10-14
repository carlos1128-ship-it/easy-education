/* eslint-disable @typescript-eslint/no-require-imports -- Script CommonJS executado diretamente pelo Node. */
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { loadEnvConfig } = require("@next/env");
const { createClient } = require("@supabase/supabase-js");
const { createServerClient } = require("@supabase/ssr");
const { PrismaClient } = require("@prisma/client");
loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const origin = process.env.QA_ORIGIN || "http://127.0.0.1:3107";
const statePath = process.env.QA_STATE || path.join(os.tmpdir(), "easy-exams-qa.json");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
const dbUrl = new URL(process.env.DATABASE_URL);
if (dbUrl.port === "6543") dbUrl.searchParams.set("pgbouncer", "true");
dbUrl.searchParams.set("connection_limit", "1");
const db = new PrismaClient({datasources:{db:{url:dbUrl.toString()}}});
const demoId = "d5e80833-e0b1-41a8-b3f9-c371560ee301";
async function cookies(email,password){
  const values=new Map();
  const client=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,{cookies:{getAll:()=>[...values].map(([name,value])=>({name,value})),setAll:(items)=>items.forEach(({name,value})=>values.set(name,value))}});
  const signed=await client.auth.signInWithPassword({email,password});if(signed.error)throw signed.error;
  return [...values].map(([name,value])=>`${name}=${value}`).join("; ");
}
async function provision(){
  try{await fs.access(statePath);throw new Error("Estado QA já existe; faça cleanup antes de criar outras contas.");}catch(e){if(e.code!=="ENOENT")throw e;}
  const state={users:[],examIds:[]};await fs.writeFile(statePath,JSON.stringify(state));
  for(let i=0;i<2;i++){
    const email=`qa-exams-${randomUUID()}@example.com`,password=`Qa-${randomUUID()}-A1!`;
    const result=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name:"QA Provas descartável"}});if(result.error)throw result.error;
    const user={id:result.data.user.id,email,password};state.users.push(user);await fs.writeFile(statePath,JSON.stringify(state));
    await db.profile.upsert({where:{userId:user.id},create:{userId:user.id,name:"QA Provas",email,onboardingDone:true,tourCompletedAt:new Date()},update:{onboardingDone:true,tourCompletedAt:new Date()}});
    await db.subscription.create({data:{userId:user.id,provider:"cakto",plan:"full",status:"active",currentPeriodEnd:new Date(Date.now()+4*3600*1000)}});
  }
  console.log(JSON.stringify({created:2,adminEmailForLocalServer:state.users[0].email,statePath,charges:0}));
}
async function test(){
  const state=JSON.parse(await fs.readFile(statePath,"utf8"));const [one,two]=state.users;
  const cookie=await cookies(one.email,one.password),otherCookie=await cookies(two.email,two.password);
  async function request(route,method="GET",body,auth=cookie){const response=await fetch(origin+route,{method,headers:{Cookie:auth,Origin:origin,"Content-Type":"application/json"},body:body===undefined?undefined:JSON.stringify(body),redirect:"manual",signal:AbortSignal.timeout(60000)});const text=await response.text();let data;try{data=JSON.parse(text);}catch{data={error:text.slice(0,180)};}return {status:response.status,data};}
  const checks=[];
  assert.equal((await request("/api/past-exams/attempts","POST",{},"")).status,401);
  const started=await request("/api/past-exams/attempts","POST",{examId:demoId,requestId:randomUUID()});assert.equal(started.status,200,JSON.stringify(started));const id=started.data.id;
  let view=(await request(`/api/past-exams/attempts/${id}`)).data;
  assert.ok(!JSON.stringify(view).includes('"correct"'));assert.equal(view.result,null);checks.push("answer key hidden before finish");
  assert.equal((await request(`/api/past-exams/attempts/${id}`,"GET",undefined,otherCookie)).status,404);checks.push("cross-user access rejected");
  const saved=await request(`/api/past-exams/attempts/${id}`,"PATCH",{version:view.version,action:"save",answers:[{number:1,value:"B",reviewed:true},{number:2,value:"A",reviewed:false},{number:4,value:"Restam 80% do preço.",reviewed:false}]});assert.equal(saved.status,200,JSON.stringify(saved));view=saved.data;
  assert.equal((await request(`/api/past-exams/attempts/${id}`,"PATCH",{version:0,action:"save",answers:[]})).status,409);checks.push("stale concurrent save rejected");
  const paused=await request(`/api/past-exams/attempts/${id}`,"PATCH",{version:view.version,action:"pause",answers:[]});assert.equal(paused.status,200);assert.equal(paused.data.status,"paused");view=paused.data;
  const stored=await db.examAttempt.findUnique({where:{id},include:{answers:true}});assert.equal(stored.activeSince,null);assert.equal(stored.answers.length,3);checks.push("autosave and pause persisted");
  assert.equal((await request(`/api/past-exams/attempts/${id}`,"PATCH",{version:view.version,action:"save",answers:[{number:1,value:"A",reviewed:false}]})).status,400);
  const resumed=await request(`/api/past-exams/attempts/${id}`,"PATCH",{version:view.version,action:"resume",answers:[]});assert.equal(resumed.status,200);view=resumed.data;
  const pdf=await request(`/api/past-exams/documents/${view.document.id}`);assert.equal(pdf.status,200,JSON.stringify(pdf));const bytes=await(await fetch(pdf.data.url)).arrayBuffer();assert.equal(Buffer.from(bytes).subarray(0,5).toString(),"%PDF-");checks.push("licensed PDF delivered with temporary URL");
  const finished=await request(`/api/past-exams/attempts/${id}`,"PATCH",{version:view.version,action:"finish",answers:[]});assert.equal(finished.status,200);assert.equal(finished.data.status,"finished");assert.equal(finished.data.result.correct,1);assert.equal(finished.data.result.wrong,1);assert.equal(finished.data.result.unanswered,2);assert.equal(finished.data.result.pending,1);assert.equal(finished.data.result.annulled,1);assert.equal(finished.data.result.percentage,25);assert.ok(finished.data.result.rows[0].explanation.length>30);checks.push("grading + explanations + annulled + written answers");
  assert.equal((await request(`/api/past-exams/attempts/${id}`,"PATCH",{version:0,action:"finish",answers:[]})).status,200);checks.push("finish idempotent");
  const history=await fetch(origin+"/dashboard/provas/historico",{headers:{Cookie:cookie},signal:AbortSignal.timeout(60000)});assert.equal(history.status,200);assert.ok((await history.text()).includes("25%"));checks.push("history renders persisted result");
  const official=await db.pastExam.findFirst({where:{isDemo:false,status:"catalogued"},include:{documents:true}});
  if(official){assert.equal((await request("/api/past-exams/attempts","POST",{examId:official.id,requestId:randomUUID()})).status,404);assert.equal((await request(`/api/past-exams/documents/${official.documents.find(d=>d.kind==="exam").id}`)).status,404);checks.push("unreviewed key and unlicensed PDF blocked");}
  const adminResult=await request("/api/internal/past-exams");
  if(adminResult.status===200){
    const source=adminResult.data.exams.find(e=>e.id===demoId);const snapshot=source.keys[0].snapshot;
    const draft={...snapshot,title:"QA temporário de publicação",document:{sourceUrl:"https://example.org/exam.pdf"},keyDocument:{sourceUrl:"https://example.org/key.pdf"}};
    const created=await request("/api/internal/past-exams","POST",{action:"save",exam:draft});assert.equal(created.status,200,JSON.stringify(created));state.examIds.push(created.data.id);await fs.writeFile(statePath,JSON.stringify(state));
    assert.equal((await request("/api/internal/past-exams","POST",{action:"publish",id:created.data.id,keyId:created.data.keyId,version:created.data.version,confirm:false})).status,400);
    const pdfDoc=await db.examDocument.findFirst({where:{examId:created.data.id,kind:"exam"}});
    assert.equal((await request("/api/internal/past-exams/documents","POST",{documentId:pdfDoc.id,action:"upload"})).status,403);checks.push("admin publication confirmation + rights guard");
    assert.equal((await request("/api/internal/past-exams","GET",undefined,otherCookie)).status,404);
  }
  console.log(JSON.stringify({passed:checks,origin,aiCalls:0,realCharges:0}));
}
async function cleanup(){
  const state=JSON.parse(await fs.readFile(statePath,"utf8"));
  for(const user of state.users){await db.examAttempt.deleteMany({where:{userId:user.id}});await db.subscription.deleteMany({where:{userId:user.id}});await db.profile.deleteMany({where:{userId:user.id}});const deleted=await admin.auth.admin.deleteUser(user.id);if(deleted.error)throw deleted.error;}
  for(const id of state.examIds)await db.pastExam.deleteMany({where:{id,title:"QA temporário de publicação"}});
  await fs.unlink(statePath);console.log(JSON.stringify({testUsersRemoved:state.users.length,testExamsRemoved:state.examIds.length}));
}
const mode=process.argv[2];
(mode==="provision"?provision():mode==="cleanup"?cleanup():test()).catch(e=>{console.error(e.message);process.exitCode=1;}).finally(()=>db.$disconnect());
