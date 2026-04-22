import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";

const SUPPORTED = ["sr-Latn", "sr-Cyrl", "hr", "bs", "cnr", "en"];

export default getRequestConfig(async () => {
  const localeCookie = cookies().get("img.locale")?.value;
  const acceptLang = headers().get("accept-language") ?? "";
  const fromAccept = acceptLang.split(",").map((s) => s.split(";")[0].trim()).find((l) => SUPPORTED.includes(l));
  const locale = localeCookie && SUPPORTED.includes(localeCookie) ? localeCookie : fromAccept ?? "sr-Latn";
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
