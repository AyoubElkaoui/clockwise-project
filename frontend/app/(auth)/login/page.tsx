"use client";
import { JSX, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
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
  const [userInput, setUserInput] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === "nl" ? "en" : "nl";
    i18n.changeLanguage(newLang);
  };

  const handleLogin = async (): Promise<void> => {
    if (!userInput.trim() || !password.trim()) {
      setError(t("login.fillAllFields"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const user = await login(userInput, password);

      // Wis eerst alle bestaande data
      localStorage.clear();

      // Sla nieuwe gegevens op
      localStorage.setItem("userId", user.id);
      localStorage.setItem("firstName", user.firstName);
      localStorage.setItem("lastName", user.lastName);
      localStorage.setItem("userRank", user.rank);

      // Zet cookies
      document.cookie = `userId=${user.id}; path=/; max-age=3600;`;
      document.cookie = `userRank=${user.rank}; path=/; max-age=3600;`;

      // Stuur naar juiste dashboard
      if (user.rank === "admin") {
        router.push("/admin");
      } else if (user.rank === "manager") {
        router.push("/manager/dashboard");
      } else {
        router.push("/dashboard");
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(t("login.invalidCredentials"));
      } else {
        setError(t("login.unknownError"));
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
        <Card variant="elevated" padding="lg">
          {/* Header Section */}
          <CardHeader className="text-center pb-6">
            <div className="flex justify-center mb-6">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4">
                <Image
                  src={theme === "dark" ? "/white_logo.png" : "/logo.png"}
                  alt="Elmar Services Logo"
                  width={80}
                  height={80}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div className="flex justify-center gap-2 mb-4">
              <button
                onClick={toggleTheme}
                className="btn btn-ghost btn-sm"
                title={
                  theme === "dark"
                    ? "Switch to light mode"
                    : "Switch to dark mode"
                }
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>
              <button
                onClick={toggleLanguage}
                className="btn btn-ghost btn-sm"
                title="Switch language"
              >
                {i18n.language === "nl" ? "EN" : "NL"}
              </button>
            </div>
            <CardTitle className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
              {t("login.welcomeBack")}
            </CardTitle>
            <p className="text-slate-600 dark:text-slate-400">
              {t("login.loginToContinue")}
            </p>
          </CardHeader>

          {/* Form Section */}
          <CardContent className="space-y-6">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t("login.emailOrUsername")}
              </label>
              <Input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t("login.emailPlaceholder")}
                icon={<EnvelopeIcon className="w-5 h-5" />}
                disabled={isLoading}
              />
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t("login.password")}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t("login.passwordPlaceholder")}
                  icon={<LockClosedIcon className="w-5 h-5" />}
                  disabled={isLoading}
                  className="pr-12"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors duration-200"
                  onClick={() => setShowPassword(!showPassword)}
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
              disabled={isLoading || !userInput.trim() || !password.trim()}
              className="w-full text-slate-900 dark:text-white"
              size="lg"
              isLoading={isLoading}
            >
              {!isLoading && (
                <>
                  {t("login.login")}
                  <ArrowRightIcon className="w-5 h-5" />
                </>
              )}
            </Button>

            {/* Additional Options */}
            <div className="text-center">
              <a
                href="#"
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors duration-200"
              >
                {t("login.forgotPassword")}
              </a>
            </div>
          </CardContent>

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
