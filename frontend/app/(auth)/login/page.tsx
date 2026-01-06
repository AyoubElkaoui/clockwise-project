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
import { useTheme } from "@/lib/theme-context";
import { useTranslation } from "react-i18next";

export default function LoginPage(): JSX.Element {
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
      const response = await login(username, password);

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

      // Zet cookies
      document.cookie = `userId=${response.user.id}; path=/; max-age=3600;`;
      document.cookie = `userRank=${response.user.role}; path=/; max-age=3600;`;
      document.cookie = `token=${response.token}; path=/; max-age=3600;`;

      // Stuur naar dashboard
      router.push("/dashboard");
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError("Ongeldige gebruikersnaam of wachtwoord");
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 dark:bg-indigo-600/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-400/10 dark:bg-purple-600/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <Card className="backdrop-blur-sm bg-white/90 dark:bg-slate-800/90 shadow-2xl border-white/20 dark:border-slate-700/50">
          {/* Header Section */}
          <CardHeader className="text-center pb-8 pt-8">
            <div className="flex justify-center mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 rounded-3xl p-6 shadow-xl">
                <Image
                  src={theme === "dark" ? "/logo_white.png" : "/logo.png"}
                  alt="TIMR Logo"
                  width={80}
                  height={80}
                  className="w-20 h-20 rounded-xl object-contain drop-shadow-lg"
                />
              </div>
            </div>
            <div className="flex justify-center gap-2 mb-6">
              <button
                onClick={toggleTheme}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title={theme === "dark" ? "Licht thema" : "Donker thema"}
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
              <button
                onClick={toggleLanguage}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors font-semibold text-sm"
                title="Taal wijzigen"
              >
                {i18n.language === "nl" ? "EN" : "NL"}
              </button>
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent mb-2">
              {t("login.welcomeBack")}
            </CardTitle>
            <p className="text-slate-600 dark:text-slate-400">
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
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

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
              disabled={isLoading || !username.trim() || !password.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
              size="lg"
              isLoading={isLoading}
            >
              {!isLoading && (
                <>
                  {t("login.login")}
                  <ArrowRightIcon className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>

            {/* Additional Options */}
            <div className="text-center">
              <a
                href="#"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200 font-medium"
              >
                {t("login.forgotPassword")}
              </a>
            </div>
          </CardContent>

          {/* Footer */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-800 dark:to-slate-800/50 px-6 py-4 text-center border-t border-slate-200 dark:border-slate-700 rounded-b-xl">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("login.copyright")}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
