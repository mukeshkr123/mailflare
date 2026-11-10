import { getServerTranslator } from "@/lib/i18n/server";

export default async function LicensesPage() {
	const t = await getServerTranslator();
	return (
		<div className="max-w-3xl space-y-6">
			<h1 className="text-2xl font-medium text-neutral-900">{t("selfHosted.title")}</h1>
			<p className="text-sm leading-6 text-neutral-600">{t("selfHosted.description")}</p>
			<ul className="list-disc space-y-2 pl-5 text-sm text-neutral-700">
				<li>{t("selfHosted.branding")}</li>
				<li>{t("selfHosted.accounts")}</li>
				<li>{t("selfHosted.sharing")}</li>
				<li>{t("selfHosted.forwarding")}</li>
			</ul>
			<p className="text-sm text-neutral-600">{t("selfHosted.providers")}</p>
			<p className="text-sm text-neutral-600">{t("selfHosted.notice")}</p>
			<div className="flex gap-6 text-sm font-medium text-blue-700">
				<a className="underline" href="https://github.com/mukeshkr123/mailflare">{t("selfHosted.source")}</a>
				<a className="underline" href="https://github.com/mukeshkr123/mailflare/blob/main/LICENSE">{t("selfHosted.license")}</a>
			</div>
		</div>
	);
}
