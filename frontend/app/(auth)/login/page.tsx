"use client";
import { JSX, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/api/auth";
import Image from "next/image";
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTheme } from "@/lib/theme-context";
import { useTranslation } from "react-i18next";

export default function LoginPage(): JSX.Element {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState<boolean>(false);
  const [requires2FA, setRequires2FA] = useState<boolean>(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<"email" | "totp" | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState<string>("");
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const handleLogin = async (): Promise<void> => {
    if (!username.trim() || !password.trim()) {
      setError("Voer gebruikersnaam en wachtwoord in");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await login(username, password, requires2FA ? twoFactorCode : undefined);

      if (response.requires2FA) {
        setRequires2FA(true);
        setTwoFactorMethod(response.method);
        setIsLoading(false);
        return;
      }

      localStorage.clear();
      localStorage.setItem("token", response.token);
      localStorage.setItem("userId", response.user.id);
      localStorage.setItem("username", response.user.username);
      localStorage.setItem("medewGcId", response.user.medew_gc_id);
      localStorage.setItem("firstName", response.user.first_name || "");
      localStorage.setItem("lastName", response.user.last_name || "");
      localStorage.setItem("userRank", response.user.role);
      localStorage.setItem("email", response.user.email || "");
      localStorage.setItem("allowedTasks", response.user.allowed_tasks || "BOTH");
      localStorage.setItem("twoFactorEnabled", response.user.twoFactorEnabled ? "true" : "false");

      document.cookie = `userId=${response.user.id}; path=/; max-age=3600;`;
      document.cookie = `userRank=${response.user.role}; path=/; max-age=3600;`;
      document.cookie = `token=${response.token}; path=/; max-age=3600;`;

      if (response.require2FASetup) {
        localStorage.setItem("require2FASetup", "true");
        if (response.user.role === "manager") {
          router.push("/manager/account/2fa");
        } else if (response.user.role === "admin") {
          router.push("/admin/account/2fa");
        } else {
          router.push("/account/2fa");
        }
        return;
      }

      if (response.user.role === "manager") {
        router.push("/manager/dashboard");
      } else if (response.user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (e: any) {
      const serverMessage = e?.response?.data?.message;
      if (serverMessage) {
        setError(serverMessage);
      } else if (requires2FA) {
        setError("Ongeldige 2FA code");
      } else {
        setError("Ongeldige gebruikersnaam of wachtwoord");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — brand ── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(145deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)" }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #FFFFFF 0%, transparent 70%)" }} />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #BFDBFE 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #FFFFFF 0%, transparent 60%)" }} />

        {/* Logo */}
        <div className="relative z-10">
          <Image
            src="/clockd-logo-white.png"
            alt="CLOCKD"
            width={160}
            height={32}
            priority
          />
        </div>

        {/* Centre content */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Tijdregistratie<br />voor professionals
            </h1>
            <p className="text-blue-100 text-lg max-w-sm">
              Registreer uren, beheer projecten en krijg inzicht in je werkweek — alles op één plek.
            </p>
          </div>

          {/* Feature bullets */}
          <div className="space-y-3">
            {[
              "Eenvoudig uren registreren per dag",
              "Verlof- en vakantiebeheer",
              "Manager goedkeuringen & rapportages",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-blue-50 text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-blue-200 text-xs">
            © {new Date().getFullYear()} Clockd · Altum Technical Solutions
          </p>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 bg-white dark:bg-slate-900">
        {/* Top bar — mobile logo + controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-600 dark:text-slate-400"
            title={theme === "dark" ? "Licht thema" : "Donker thema"}
          >
            {theme === "dark" ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => i18n.changeLanguage("en")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              i18n.language === "en"
                ? "bg-[#2563EB] text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => i18n.changeLanguage("nl")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              i18n.language === "nl"
                ? "bg-[#2563EB] text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            NL
          </button>
        </div>

        {/* Mobile logo (shown only on small screens) */}
        <div className="lg:hidden mb-8">
          <Image
            src={theme === "dark" ? "/clockd-logo-white.png" : "/clockd-logo.png"}
            alt="CLOCKD"
            width={140}
            height={28}
            priority
          />
        </div>

        {/* Form card */}
        <div className="w-full max-w-md space-y-8">
          {/* Heading */}
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              {t("login.welcomeBack")}
            </h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400 text-sm">
              {t("login.loginToContinue")}
            </p>
          </div>

          {/* Fields */}
          <div className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Gebruikersnaam
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="bijv. admin of testuser"
                disabled={isLoading}
                className="h-11"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Wachtwoord
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Voer wachtwoord in"
                  disabled={isLoading || requires2FA}
                  className="pr-10 h-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  disabled={requires2FA}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* 2FA */}
            {requires2FA && (
              <div className="space-y-2">
                <Alert className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
                  <AlertDescription className="text-blue-900 dark:text-blue-100 text-sm">
                    {twoFactorMethod === "email"
                      ? "Verificatiecode verstuurd naar je email"
                      : "Voer de code in van je authenticator app"}
                  </AlertDescription>
                </Alert>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  2FA Verificatiecode
                </label>
                <Input
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ""))}
                  onKeyPress={handleKeyPress}
                  className="text-center text-2xl tracking-widest h-14"
                  autoFocus
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Verloren toegang? Gebruik een backup code of neem contact op met je beheerder.
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <svg className="shrink-0 h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
              </div>
            )}

            {/* Submit */}
            <Button
              onClick={handleLogin}
              disabled={
                isLoading ||
                !username.trim() ||
                !password.trim() ||
                (requires2FA && twoFactorCode.length !== 6)
              }
              className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold shadow-sm transition-all duration-200"
              size="lg"
              isLoading={isLoading}
            >
              {!isLoading && (
                <>
                  {requires2FA ? "Verifieer 2FA" : t("login.login")}
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            {/* Forgot password */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(true)}
                className="text-sm text-[#2563EB] hover:text-[#1D4ED8] transition-colors font-medium"
              >
                {t("login.forgotPassword")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot password modal */}
      {showForgotPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                <LockClosedIcon className="w-8 h-8 text-[#2563EB]" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Wachtwoord Vergeten?
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                Op dit moment is het niet mogelijk om zelf je wachtwoord te resetten.
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <EnvelopeIcon className="w-6 h-6 text-[#2563EB] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Neem contact op met de beheerder
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Stuur een e-mail naar je manager of IT-beheerder om je wachtwoord te laten resetten.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => setShowForgotPasswordModal(false)}
              className="w-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
            >
              Begrepen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
