import OpenAI from "openai";

const client = process.env.OPENAI_API_KEY ? new OpenAI() : null;
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

export async function buildCustomerIntelligence(profile, scenario) {
  const features = deriveFeatures(profile);
  const event = detectLifeEvent(profile, scenario, features);
  const eligible = rankEligibleProducts(profile, features);
  const fallback = deterministicInsights(profile, event, eligible, features);
  if (!client) return { source:"deterministic-fallback", model:null, ...fallback };
  try {
    const response = await client.responses.create({
      model,
      input: [{ role:"system", content:"You are a bank relationship intelligence analyst. Use only supplied facts. Never invent customer data, eligibility, prices, or outcomes. Produce concise needs-led insights, not sales pressure or financial advice." }, { role:"user", content: JSON.stringify({ task:"Explain the detected life event and provide one narrative for every supplied eligible product.", persona:profile.persona, derivedFeatures:features, detectedEvent:event, eligibleProducts:eligible }) }],
      text:{ format:{ type:"json_schema", name:"relationship_intelligence", strict:true, schema:{ type:"object", additionalProperties:false, properties:{ executiveSummary:{type:"string"}, conversationOpener:{type:"string"}, discoveryQuestions:{type:"array",items:{type:"string"}}, productNarratives:{type:"array",items:{type:"object",additionalProperties:false,properties:{name:{type:"string"},narrative:{type:"string"}},required:["name","narrative"]}} }, required:["executiveSummary","conversationOpener","discoveryQuestions","productNarratives"] } } },
      temperature:0.2,
      max_output_tokens:700
    });
    const parsed = JSON.parse(response.output_text);
    const ai = { ...parsed, productNarratives:Object.fromEntries(parsed.productNarratives.map(item=>[item.name,item.narrative])) };
    return { source:"openai", model, ...fallback, ai };
  } catch (error) {
    return { source:"deterministic-fallback", model, warning:error instanceof Error?error.message:"AI request failed", ...fallback };
  }
}

export function deriveFeatures(profile){
  const txs=profile.transactions; const by=c=>txs.filter(t=>t.category===c); const sum=c=>Math.abs(by(c).reduce((n,t)=>n+t.amount,0));
  const income=by("income").map(t=>t.amount).filter(v=>v>0); const payroll=by("income").filter(t=>isPayroll(t)&&t.amount>0).map(t=>t.amount); const recentIncome=income.at(-1)||0;
  const dates=txs.map(t=>t.date||t.postDate).sort();
  return { transactionWindowDays:daysBetween(dates[0],dates.at(-1)), childcareRecurringMonths:new Set(by("childcare").map(t=>(t.date||t.postDate).slice(0,7))).size, babySpendTotal:sum("baby"), babySpendGrowth:categorySpendGrowth(txs,"baby"), missingPayrollCycles:countMissingPayrollCycles(txs), priorPayrollAverage:payroll.length?Math.round(payroll.reduce((a,b)=>a+b,0)/payroll.length):0, recentObservedIncome:recentIncome, weddingSpend90d:sum("wedding"), partnerContributionMonths:new Set(by("partnerTransfer").map(t=>(t.date||t.postDate).slice(0,7))).size, partnerContributions:by("partnerTransfer").reduce((n,t)=>n+t.amount,0), monthlySurplus:profile.persona.monthlyIncome-profile.baseline.avgMonthlySpend, protectionGap:Math.max(0,profile.baseline.estimatedProtectionNeed-profile.baseline.protectionCover), emergencyFundMonths:profile.baseline.emergencyFundMonths, transactionCount:txs.length, accountCount:new Set(txs.map(t=>t.accountId).filter(Boolean)).size };
}

function detectLifeEvent(profile,scenario,f){
  const evidence=[]; let score=0;
  if(scenario.id==="new-parent"){if(f.childcareRecurringMonths>=2){score+=.48;evidence.push(e("Recurring childcare",`${f.childcareRecurringMonths} monthly occurrences`,"transaction_pattern",.96))}if(f.babySpendGrowth>250){score+=.28;evidence.push(e("Baby-category acceleration",`S$${f.babySpendGrowth} increase from first to latest observed month`,"category_trend",.89))}if(profile.persona.dependants===1){score+=.15;evidence.push(e("Customer profile change","Dependants updated from 0 to 1","customer_record",1))}}
  if(scenario.id==="job-loss"){if(f.missingPayrollCycles>=2){score+=.58;evidence.push(e("Payroll interruption",`${f.missingPayrollCycles} expected salary cycles missing`,"income_pattern",.98))}if(f.priorPayrollAverage>0){score+=.2;evidence.push(e("Historical salary baseline",`Prior average S$${f.priorPayrollAverage.toLocaleString("en-SG")}/month`,"transaction_baseline",.99))}if(f.recentObservedIncome>0&&f.recentObservedIncome<f.priorPayrollAverage*.5){score+=.09;evidence.push(e("Replacement income gap",`Latest income is ${Math.round((1-f.recentObservedIncome/f.priorPayrollAverage)*100)}% below baseline`,"cashflow_change",.87))}}
  if(scenario.id==="wedding"){if(f.weddingSpend90d>5000){score+=.5;evidence.push(e("Wedding merchant cluster",`S$${f.weddingSpend90d.toLocaleString("en-SG")} across verified wedding merchants`,"merchant_cluster",.95))}if(f.partnerContributionMonths>=2){score+=.27;evidence.push(e("Recurring partner contribution",`S$${f.partnerContributions.toLocaleString("en-SG")} across ${f.partnerContributionMonths} months`,"transfer_pattern",.9))}if(profile.persona.maritalStatus==="Engaged"){score+=.12;evidence.push(e("Customer profile","Marital status recorded as engaged","customer_record",1))}}
  return { type:scenario.event.type,label:scenario.event.label,confidence:Math.min(.98,score),evidence,alternativeHypothesis:scenario.id==="new-parent"?"Could represent childcare support for another family member":scenario.id==="job-loss"?"Could represent a payroll account switch":"Could represent event planning on behalf of someone else" };
}
function rankEligibleProducts(profile,f){return profile.candidates.map(p=>{const checks={contactConsent:profile.persona.contactConsent,positiveSurplus:f.monthlySurplus>0,mortgageHolder:profile.persona.productsHeld.includes("Home Loan"),balancedRisk:["Balanced","Growth"].includes(profile.persona.riskProfile),growthRisk:profile.persona.riskProfile==="Growth"};const results=p.checks.map(name=>({name,passed:Boolean(checks[name])}));const eligible=results.every(r=>r.passed);return {...p,fit:eligible?p.baseFit:0,eligible,guardrails:results}}).filter(p=>p.eligible).sort((a,b)=>b.fit-a.fit)}
function deterministicInsights(profile,event,products,features){return { persona:profile.persona,baseline:profile.baseline,transactions:profile.transactions,features,event,products,ai:{executiveSummary:`${event.label} detected at ${Math.round(event.confidence*100)}% confidence from ${event.evidence.length} independent signals. Review changing needs before discussing products.`,conversationOpener:`I noticed a few changes in your recent financial patterns and wanted to understand whether your priorities have changed.`,discoveryQuestions:["What has changed most in your financial priorities?","How much monthly flexibility would feel comfortable?","Which goal matters most over the next 12 months?"],productNarratives:Object.fromEntries(products.map(p=>[p.name,p.reason]))}}}
function e(label,value,source,confidence){return{label,value,source,confidence}}
function daysBetween(a,b){return Math.max(1,Math.round((new Date(b)-new Date(a))/86400000))}
function merchantOf(t){return t.merchantRaw||t.description||""}
function isPayroll(t){return t.amount>0&&/PAYROLL|SALARY/i.test(merchantOf(t))&&!/SEVERANCE|HR PAYOUT/i.test(merchantOf(t))}
function categorySpendGrowth(txs,category){
  const byMonth={};
  for (const t of txs){
    if (t.category!==category||t.amount>=0) continue;
    const month=(t.date||t.postDate).slice(0,7);
    byMonth[month]=(byMonth[month]||0)+Math.abs(t.amount);
  }
  const months=Object.keys(byMonth).sort();
  if (months.length<2) return 0;
  return Math.round(byMonth[months.at(-1)]-byMonth[months[0]]);
}
function countMissingPayrollCycles(txs){
  const payroll=txs.filter(isPayroll);
  if (!payroll.length) return 0;
  const monthOf=t=>(t.date||t.postDate).slice(0,7);
  const first=payroll.map(monthOf).sort()[0];
  const last=txs.map(monthOf).sort().at(-1);
  const have=new Set(payroll.map(monthOf));
  let missing=0;
  for (const month of monthsInclusive(first,last)) if (!have.has(month)) missing+=1;
  return missing;
}
function monthsInclusive(start,end){
  const out=[];
  const cursor=new Date(`${start}-01T00:00:00Z`);
  const stop=new Date(`${end}-01T00:00:00Z`);
  while (cursor<=stop){
    out.push(cursor.toISOString().slice(0,7));
    cursor.setUTCMonth(cursor.getUTCMonth()+1);
  }
  return out;
}
