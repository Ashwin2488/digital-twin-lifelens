import { heroLedgers } from "./heroLedgers.js";

export const customerProfiles = {
  "new-parent": {
    persona: { fullName:"Amira Malik", initials:"AM", age:34, occupation:"Product Director", employer:"Nimbus Labs", maritalStatus:"Married", dependants:1, tenureMonths:76, riskProfile:"Balanced", contactConsent:true, phone:"+65 9123 8841", segment:"Priority", totalAssets:186400, monthlyIncome:6200, liabilities:38400, productsHeld:["Everyday Account","Rewards Card","Balanced Portfolio"], goals:["Build family safety net","Fund child's education","Retain liquidity"] },
    baseline: { avgMonthlyIncome:6200, avgMonthlySpend:4650, liquidBalance:14200, emergencyFundMonths:3.1, protectionCover:180000, estimatedProtectionNeed:600000 },
    transactions: heroLedgers["new-parent"],
    candidates: [
      product("Family Protection Plan","PROTECTION",2400,96,"New dependant and a S$420K protection gap.","Protects 7 years of household income",480,["contactConsent","positiveSurplus"]),
      product("SmartSaver Plus","SAVINGS",1250,91,"Childcare costs reduce the existing emergency runway.","Builds a 4-month family buffer",350,["positiveSurplus"]),
      product("Education Builder","INVESTMENT",900,84,"18-year goal horizon and balanced risk profile.","Potential S$82K education fund",250,["balancedRisk","positiveSurplus"])
    ]
  },
  "job-loss": {
    persona: { fullName:"Daniel Tan", initials:"DT", age:42, occupation:"Operations Lead", employer:"Formerly Vertex Logistics", maritalStatus:"Married", dependants:2, tenureMonths:109, riskProfile:"Conservative", contactConsent:true, phone:"+65 9782 3306", segment:"Priority", totalAssets:312800, monthlyIncome:0, liabilities:221000, productsHeld:["Everyday Account","Home Loan","Term Deposit"], goals:["Preserve cash runway","Maintain essential cover","Return to stable income"] },
    baseline: { avgMonthlyIncome:7800, avgMonthlySpend:3850, liquidBalance:14500, emergencyFundMonths:3.8, protectionCover:450000, estimatedProtectionNeed:520000 },
    transactions: heroLedgers["job-loss"],
    candidates: [product("Payment Relief Programme","SUPPORT",0,98,"Two missing payroll cycles while home-loan payments continue.","Extends cash runway by 3 months",1200,["contactConsent","mortgageHolder"]),product("FlexiCash Reserve","LIQUIDITY",780,89,"Short-term liquidity pressure with strong repayment history.","Creates an emergency bridge",420,["contactConsent"]),product("Career Transition Cover","PROTECTION",816,78,"Existing protection should be reviewed during employment transition.","Maintains essential coverage",310,["contactConsent"])]
  },
  wedding: {
    persona: { fullName:"Priya Shah", initials:"PS", age:31, occupation:"Legal Counsel", employer:"Meridian Legal", maritalStatus:"Engaged", dependants:0, tenureMonths:56, riskProfile:"Growth", contactConsent:true, phone:"+65 9014 5572", segment:"Priority", totalAssets:228600, monthlyIncome:7800, liabilities:12400, productsHeld:["Everyday Account","Travel Card","Growth Portfolio"], goals:["Manage wedding payments","Combine finances","Buy a home in 3 years"] },
    baseline: { avgMonthlyIncome:7800, avgMonthlySpend:5100, liquidBalance:15700, emergencyFundMonths:3.1, protectionCover:250000, estimatedProtectionNeed:300000 },
    transactions: heroLedgers.wedding,
    candidates: [product("Premier Joint Account","BANKING",600,97,"Repeated partner contributions and shared vendor expenses.","One view of shared finances",900,["contactConsent"]),product("Celebration Instalments","CREDIT",520,90,"S$7,930 of wedding payments cluster within 90 days.","Smooths peak vendor payments",700,["contactConsent","positiveSurplus"]),product("Couples Wealth Plan","INVESTMENT",1100,83,"Strong surplus and a stated three-year home goal.","Starts a shared wealth journey",600,["growthRisk","positiveSurplus"])]
  }
};

function product(name,type,annualValue,baseFit,reason,impact,monthlyImpact,checks){return {name,type,annualValue,baseFit,reason,impact,monthlyImpact,checks}}
