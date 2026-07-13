export * from "./admin-helper";
export * from "./departments";
export * from "./business-units";
export * from "./surveys";
export { cloneSurvey, archiveSurvey } from "./surveys";
export * from "./questions";
export * from "./users";
export { setUserActive } from "./users";
export * from "./responses";
export * from "./notifications";
export * from "./analytics";
export * from "./bulletin";


export {
  MOCK_USERS,
  MOCK_SURVEYS,
  QUESTION_BANK,
  OPEN_FEEDBACK,
  ENGAGEMENT_BY_DEPT as MOCK_ENGAGEMENT_BY_DEPT,
  ENGAGEMENT_TREND,
  RESPONSE_DISTRIBUTION,
  CATEGORY_SCORES,
  HEATMAP_DATA,
  DEPARTMENTS as MOCK_DEPARTMENTS,
  BUSINESS_UNITS,
  LOCATIONS,
  LEVELS,
  GENDERS,
  AGE_RANGES,
  TENURE,
} from "@/lib/mock-data";

export const ANALYTICS = {
  ENGAGEMENT_BY_DEPT: null as { dept: string; score: number; responses: number }[] | null,
  ENGAGEMENT_TREND: null as { period: string; score: number }[] | null,
  RESPONSE_DISTRIBUTION: null as { rating: string; count: number }[] | null,
  CATEGORY_SCORES: null as { category: string; score: number }[] | null,
  HEATMAP_DATA: null as { dept: string; A: number; B: number; C: number }[] | null,
};
