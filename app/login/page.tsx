"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/components/LanguageContext";

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { language } = useLanguage();

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signIn("google", { callbackUrl: "/" });
  };

  const handleGuestMode = () => {
    document.cookie = "guest_mode=true; path=/; max-age=86400";
    router.push("/");
  };

  // وضع الضيف العام (متاح دائمًا)
  const handleBrowseAsGuest = () => {
    document.cookie = "guest_mode=true; path=/; max-age=86400";
    router.push("/");
  };

  const showGuestButton =
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_ENABLE_GUEST_MODE === "true";

  // نصوص متعددة اللغات للخيار الجديد
  const browseAsGuestText = {
    ar: "تصفح التطبيق كضيف",
    en: "Browse as guest",
    fr: "Parcourir en tant qu'invité",
  }[language] || "Browse as guest";

  const guestDisclaimerText = {
    ar: "يمكنك استخدام التطبيق بدون حساب، لكن لن تتم مزامنة بياناتك.",
    en: "You can use the app without an account, but your data won't be synced.",
    fr: "Vous pouvez utiliser l'application sans compte, mais vos données ne seront pas synchronisées.",
  }[language] || "You can use the app without an account, but your data won't be synced.";

  return (
    <div className="min-h-screen bg-[#E65100] flex items-center justify-center p-6">
      <div className="bg-white dark:bg-black rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        {/* حاوية دائرية للشعار */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <Image
              src="/maskable_icon_x384.png"
              alt="Smarty Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>

        <h1 className="text-3xl font-black text-[#E65100] dark:text-white mb-2">
          Smarty
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {language === "ar" ? "سجل دخولك للمتابعة" : language === "fr" ? "Connectez-vous pour continuer" : "Sign in to continue"}
        </p>

        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-xl py-3 px-4 text-gray-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-[#E65100] border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>
                {language === "ar" ? "تسجيل الدخول باستخدام Google" : language === "fr" ? "Se connecter avec Google" : "Sign in with Google"}
              </span>
            </>
          )}
        </button>

        {/* خيار تصفح التطبيق كضيف (متاح دائمًا) */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={handleBrowseAsGuest}
            className="w-full text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-[#E65100] dark:hover:text-[#E65100] transition"
          >
             {browseAsGuestText}
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {guestDisclaimerText}
          </p>
        </div>

        {/* وضع الضيف التطويري (يظهر فقط في بيئة التطوير أو عند تفعيل المتغير) */}
        {showGuestButton && (
          <div className="mt-4">
            <button
              onClick={handleGuestMode}
              className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition underline-offset-2 underline"
            >
                تخطي تسجيل الدخول 
            </button>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              هذا الخيار متاح فقط في بيئة التطوير. لن يتم حفظ أي بيانات شخصية.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
