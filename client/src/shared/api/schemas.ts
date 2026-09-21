import { z } from "zod";

export const customerSchema = z.object({
  id: z.string(),
  scenarioId: z.string().nullable(),
  initials: z.string(),
  fullName: z.string(),
  age: z.number(),
  occupation: z.string(),
  segment: z.string(),
  aum: z.number(),
  lastContactDays: z.number(),
  phone: z.string(),
  status: z.object({ key: z.string(), label: z.string() }),
  eventLabel: z.string().nullable(),
  notes: z.string().optional(),
});

export const customerListSchema = z.object({
  customers: z.array(customerSchema),
  portfolioSize: z.number(),
  counts: z.object({
    lifeEvents: z.number(),
    reviewDue: z.number(),
  }),
});

export const healthSchema = z.object({
  ok: z.boolean(),
  aiConnected: z.boolean(),
  detectLlmOn: z.boolean(),
  provider: z.string().nullable(),
  model: z.string().nullable(),
});

export const scenarioSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  customer: z.string(),
  event: z.object({
    type: z.string().optional(),
    label: z.string(),
    confidence: z.number(),
    detectedMonth: z.string().optional(),
  }),
  suggestedQuestions: z.array(z.string()).optional(),
});

export const unknownRecord = z.any();

export const projectionSchema = unknownRecord;
export const scenarioDetailSchema = unknownRecord;

export const triageRowSchema = z.object({
  id: z.string(),
  split: z.string(),
  persona: unknownRecord,
  event: z.object({ id: z.string().optional(), label: z.string(), confidence: z.number() }),
  eligibleValue: z.number(),
  score: z.number(),
});

export const planRowSchema = unknownRecord;
export const avatarSchema = z.object({
  coins: z.number(),
  owned: z.array(z.string()),
  equipped: z.array(z.string()),
  colour: z.string(),
});

export const experienceSchema = z.any();

export const metricsSchema = unknownRecord;
export const logRowSchema = z.object({
  type: z.string(),
  detail: z.string().optional(),
  at: z.string(),
});
