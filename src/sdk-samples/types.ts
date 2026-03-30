/**
 * SDK code sample types for Playground V2.
 * Each language provides samples keyed by flowId + stepId.
 */

/** Supported SDK languages */
export type SdkLanguage =
  | "typescript"
  | "python"
  | "go"
  | "rust"
  | "ruby"
  | "csharp"
  | "java"
  | "swift"
  | "elixir";

/** A single code sample */
export interface SdkSample {
  /** The language */
  lang: SdkLanguage;
  /** Display name for the tab */
  displayName: string;
  /** Install command (e.g., "npm install @pay-skill/sdk") */
  installCmd: string;
  /** The code snippet - complete, copy-pasteable, with imports */
  code: string;
}

/** Map of stepId -> SdkSample for a given language */
export type FlowSamples = Record<string, SdkSample>;

/** Map of flowId -> FlowSamples for a given language */
export type LanguageSamples = Record<string, FlowSamples>;

/** SDK metadata per language */
export const SDK_LANGUAGES: { lang: SdkLanguage; displayName: string; installCmd: string }[] = [
  { lang: "typescript", displayName: "TypeScript", installCmd: "npm install @pay-skill/sdk" },
  { lang: "python", displayName: "Python", installCmd: "pip install pay-sdk" },
  { lang: "go", displayName: "Go", installCmd: "go get github.com/remit-md/go-payskill" },
  { lang: "rust", displayName: "Rust", installCmd: "cargo add pay-sdk" },
  { lang: "ruby", displayName: "Ruby", installCmd: "gem install pay-sdk" },
  { lang: "csharp", displayName: "C#", installCmd: "dotnet add package Remitmd" },
  { lang: "java", displayName: "Java", installCmd: "<!-- Maven: com.payskill:pay-sdk:0.5.0 -->" },
  { lang: "swift", displayName: "Swift", installCmd: ".package(url: \"https://github.com/remit-md/swift-payskill\", from: \"0.5.0\")" },
  { lang: "elixir", displayName: "Elixir", installCmd: "{:payskill, \"~> 0.5.0\"}" },
];
