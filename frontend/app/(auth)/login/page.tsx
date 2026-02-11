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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [twoFactorMethod, setTwoFactorMethod] = useState<'email' | 'totp' | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState<string>("");
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === "nl" ? "en" : "nl";
    i18n.changeLanguage(newLang);
  };

  const handleLogin = async (): Promise<void> => {
    if (!username.trim() || !password.trim()) {
      setError("Voer gebruikersnaam en wachtwoord in");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await login(username, password, requires2FA ? twoFactorCode : undefined);

      // Check if 2FA is required
      if (response.requires2FA) {
        setRequires2FA(true);
        setTwoFactorMethod(response.method);
        setIsLoading(false);
        
        if (response.method === 'email') {
          // Show success message that email was sent
          setError(''); // Clear any previous errors
        }
        return;
      }

      // Wis eerst alle bestaande data
      localStorage.clear();

      // Sla nieuwe gegevens op
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

      // Zet cookies
      document.cookie = `userId=${response.user.id}; path=/; max-age=3600;`;
      document.cookie = `userRank=${response.user.role}; path=/; max-age=3600;`;
      document.cookie = `token=${response.token}; path=/; max-age=3600;`;

      // Check if 2FA setup is required
      if (response.require2FASetup) {
        localStorage.setItem("require2FASetup", "true");
        // Redirect based on role
        if (response.user.role === "manager") {
          router.push("/manager/account/2fa");
        } else if (response.user.role === "admin") {
          router.push("/admin/account/2fa");
        } else {
          router.push("/account/2fa");
        }
        return;
      }

      // Stuur naar dashboard based on role
      if (response.user.role === "manager") {
        router.push("/manager/dashboard");
      } else if (response.user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(requires2FA ? "Ongeldige 2FA code" : "Ongeldige gebruikersnaam of wachtwoord");
      } else {
        setError("Onbekende fout");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter") {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">

      <div className="w-full max-w-md">
        <Card className="bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Blue accent bar */}
          <div className="h-1.5 bg-[#3563E9]" />

          {/* Header Section */}
          <CardHeader className="text-center pb-6 pt-8">
            <div className="flex justify-center mb-4">
              <Image
                src={theme === "dark" ? "/logo_white.png" : "/logo.png"}
                alt="Clockd Logo"
                width={300}
                height={160}
                className="w-auto object-contain"
              />
            </div>
            <div className="flex justify-center gap-2 mb-4">
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
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
                onClick={() => i18n.changeLanguage('en')}
                className={`px-3 py-2 rounded-lg transition-colors font-semibold text-sm ${
                  i18n.language === 'en'
                    ? 'bg-[#3563E9] text-white'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => i18n.changeLanguage('nl')}
                className={`px-3 py-2 rounded-lg transition-colors font-semibold text-sm ${
                  i18n.language === 'nl'
                    ? 'bg-[#3563E9] text-white'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                NL
              </button>
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">
              {t("login.welcomeBack")}
            </CardTitle>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {t("login.loginToContinue")}
            </p>
          </CardHeader>

          {/* Form Section */}
          <CardContent className="space-y-6">
            {/* Username Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Gebruikersnaam
              </label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Voer gebruikersnaam in (bijv. admin of testuser)"
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
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
                  className="pr-10"
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

            {/* 2FA Code Input */}
            {requires2FA && (
              <div className="space-y-2">
                <Alert className="bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800">
                  <AlertDescription className="text-blue-900 dark:text-blue-100">
                    {twoFactorMethod === 'email' 
                      ? '📧 Verificatiecode verstuurd naar je email'
                      : '📱 Voer de code in van je authenticator app'}
                  </AlertDescription>
                </Alert>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  2FA Verificatiecode
                </label>
                <Input
                  type="text"
                  placeholder="000000"
                  maxLength={twoFactorMethod === 'email' ? 6 : 6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  onKeyPress={handleKeyPress}
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Verloren toegang? Gebruik een backup code of neem contact op met je beheerder.
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="stroke-current shrink-0 h-5 w-5 text-red-600 dark:text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm text-red-700 dark:text-red-300">
                    {error}
                  </span>
                </div>
              </div>
            )}

            {/* Login Button */}
            <Button
              onClick={handleLogin}
              disabled={isLoading || !username.trim() || !password.trim() || (requires2FA && twoFactorCode.length !== 6)}
              className="w-full bg-[#3563E9] hover:bg-[#2952CC] text-white shadow-md hover:shadow-lg transition-all duration-200"
              size="lg"
              isLoading={isLoading}
            >
              {!isLoading && (
                <>
                  {requires2FA ? 'Verifieer 2FA' : t("login.login")}
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            {/* Additional Options */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200 font-medium"
              >
                {t("login.forgotPassword")}
              </button>
            </div>
          </CardContent>

          {/* Forgot Password Modal */}
          {showForgotPasswordModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6">
                <div className="text-center mb-6">
                  <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                    <LockClosedIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
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
                    <EnvelopeIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
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
                  className="w-full bg-[#3563E9] hover:bg-[#2952CC] text-white"
                >
                  Begrepen
                </Button>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 text-center border-t border-slate-200 dark:border-slate-700 rounded-b-xl">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("login.copyright")}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
