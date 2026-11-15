export type Dynasty =
  | "先秦"
  | "秦汉"
  | "三国"
  | "魏晋南北朝"
  | "隋唐"
  | "宋元"
  | "明清";
export type ChatMode = "person" | "historian";
export interface Person {
  id: string;
  name: string;
  alias: string;
  dynasty: Dynasty;
  era: string;
  years: string;
  role: string;
  tags: string[];
  bio: string;
  quote: string;
  quoteSource: string;
  hometown: string;
  color: string;
  motif: "mountain" | "moon" | "bamboo" | "river";
  timeline: { year: string; title: string; detail: string }[];
  works: { title: string; text: string }[];
  relations: { name: string; type: string; detail: string }[];
  sources: { title: string; url: string; note: string }[];
  greeting: string;
}
export interface Message {
  role: "user" | "assistant";
  content: string;
}
export interface ApiSettings {
  baseUrl: string;
  model: string;
  apiKey: string;
  proxyUrl: string;
}
