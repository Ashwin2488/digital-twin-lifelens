import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiDelete, apiGet, apiPatch, apiPost } from "./client";
import {
  avatarSchema,
  experienceSchema,
  customerListSchema,
  customerSchema,
  healthSchema,
  logRowSchema,
  metricsSchema,
  planRowSchema,
  projectionSchema,
  scenarioDetailSchema,
  scenarioSummarySchema,
  triageRowSchema,
  unknownRecord,
} from "./schemas";
import { z } from "zod";

export function useCustomers(filters: Record<string, string | number | undefined>) {
  return useQuery({
    queryKey: ["customers", filters],
    queryFn: async () => {
      const { data, meta } = await apiGet("/api/customers", customerListSchema, { limit: 200, ...filters });
      return { ...data, meta };
    },
  });
}

export function useCustomer(id: string | undefined) {
  return useQuery({
    queryKey: ["customer", id],
    enabled: Boolean(id),
    queryFn: async () => (await apiGet(`/api/customers/${id}`, customerSchema)).data,
  });
}

export function useExperience() {
  return useQuery({
    queryKey: ["experience"],
    queryFn: async () => (await apiGet("/api/demo/experience", experienceSchema)).data,
    staleTime: Infinity,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: async () => (await apiGet("/api/health", healthSchema)).data,
  });
}

export function useScenarios() {
  return useQuery({
    queryKey: ["scenarios"],
    queryFn: async () =>
      (await apiGet("/api/scenarios", z.object({ scenarios: z.array(scenarioSummarySchema) }))).data.scenarios,
  });
}

export function useScenario(id: string | undefined) {
  return useQuery({
    queryKey: ["scenario", id],
    enabled: Boolean(id),
    retry: false,
    queryFn: async () => (await apiGet(`/api/scenarios/${id}`, scenarioDetailSchema)).data,
  });
}

export function useTodayTriage() {
  return useQuery({
    queryKey: ["today-triage"],
    queryFn: async () => (await apiGet("/api/today-triage", z.object({ rows: z.array(triageRowSchema) }))).data.rows,
  });
}

export function useIntelligence(id: string | undefined) {
  return useQuery({
    queryKey: ["intelligence", id],
    enabled: Boolean(id),
    queryFn: async () => (await apiGet(`/api/intelligence/${id}`, unknownRecord)).data,
  });
}

export function useCustomer360(id: string | undefined) {
  return useQuery({
    queryKey: ["customer-360", id],
    enabled: Boolean(id),
    queryFn: async () => (await apiGet(`/api/customers/${id}/360`, unknownRecord)).data,
  });
}

export function usePlans() {
  return useQuery({
    queryKey: ["plans"],
    queryFn: async () => (await apiGet("/api/plans", z.object({ plans: z.array(planRowSchema) }))).data.plans,
  });
}

export function useDemoMetrics() {
  return useQuery({
    queryKey: ["demo-metrics"],
    queryFn: async () => (await apiGet("/api/demo/metrics", metricsSchema)).data,
  });
}

export function useDemoLog() {
  return useQuery({
    queryKey: ["demo-log"],
    queryFn: async () => (await apiGet("/api/demo/log", z.object({ log: z.array(logRowSchema) }))).data.log,
  });
}

export function useAvatar() {
  return useQuery({
    queryKey: ["avatar"],
    queryFn: async () => (await apiGet("/api/demo/avatar", avatarSchema)).data,
  });
}

export function useHoldoutEval() {
  return useQuery({
    queryKey: ["holdout-eval"],
    queryFn: async () => (await apiGet("/api/eval/holdout-detection", unknownRecord)).data,
  });
}

export function useProject() {
  return useMutation({
    mutationFn: async (body: { scenarioId: string; actions: unknown[] }) =>
      (await apiPost("/api/project", projectionSchema, body)).data,
  });
}

export function useGoalPlan(id: string | undefined) {
  return useMutation({
    mutationFn: async (body: unknown) => (await apiPost(`/api/customers/${id}/goal-plan`, unknownRecord, body)).data,
  });
}

export function useLeverSuggest(id: string | undefined) {
  return useMutation({
    mutationFn: async (body: unknown) => (await apiPost(`/api/customers/${id}/lever-suggest`, unknownRecord, body)).data,
  });
}

export function useLifeIntent(id: string | undefined) {
  return useMutation({
    mutationFn: async (body: unknown) => (await apiPost(`/api/customers/${id}/intent`, unknownRecord, body)).data,
  });
}

export function usePatchCustomer() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: unknown }) =>
      (await apiPatch(`/api/customers/${id}`, customerSchema, body)).data,
    onSuccess: () => client.invalidateQueries({ queryKey: ["customers"] }),
  });
}

export function useSharePlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: unknown) => (await apiPost("/api/plans", planRowSchema, body)).data,
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["plans"] });
      client.invalidateQueries({ queryKey: ["demo-metrics"] });
    },
  });
}

export function useDeletePlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiDelete(`/api/plans/${id}`, z.object({ ok: z.boolean() }))).data,
    onSuccess: () => client.invalidateQueries({ queryKey: ["plans"] }),
  });
}

export function usePatchAvatar() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: unknown) => (await apiPatch("/api/demo/avatar", avatarSchema, body)).data,
    onSuccess: (data) => client.setQueryData(["avatar"], data),
  });
}

export function useDemoReset() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async () => (await apiPost("/api/demo/reset", unknownRecord, {})).data,
    onSuccess: () => client.invalidateQueries(),
  });
}

export function useDemoEvent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (type: string) => (await apiPost("/api/demo/event", metricsSchema, { type })).data,
    onSuccess: () => client.invalidateQueries({ queryKey: ["demo-metrics"] }),
  });
}
