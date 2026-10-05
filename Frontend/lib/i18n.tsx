"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import en from "@/locales/en.json";
import hi from "@/locales/hi.json";
import mr from "@/locales/mr.json";
export type Lang = "en" | "hi" | "mr";
export type Key = keyof typeof en;
const dictionaries: Record<Lang, Record<Key, string>> = { en, hi, mr };
const Context = createContext({
  lang: "en" as Lang,
  setLang: (_lang: Lang) => {},
  t: (key: Key): string => en[key],
});
export function I18n({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    try {
      const value = localStorage.getItem("sakshya-language");
      if (value === "hi" || value === "mr") setLang(value);
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem("sakshya-language", lang);
    } catch {}
  }, [lang]);
  return (
    <Context.Provider
      value={{ lang, setLang, t: (key) => dictionaries[lang][key] }}
    >
      {children}
    </Context.Provider>
  );
}
export const useI18n = () => useContext(Context);
