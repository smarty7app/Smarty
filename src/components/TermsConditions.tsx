import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export default function TermsConditions({ setScreen, t, isRtl }: any) {
  const handleBackToDashboard = () => {
    if (setScreen) {
      setScreen("dashboard");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="min-h-screen bg-theme-bg text-theme-text p-6 pt-24 pb-16 font-sans transition-colors duration-300"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back navigation */}
        <div className="flex items-center gap-3 animate-fade-in">
          <button
            onClick={handleBackToDashboard}
            className={`p-2 rounded-xl bg-theme-card border border-theme-border text-theme-text-muted hover:text-theme-text transition-colors cursor-pointer ${
              isRtl ? "rotate-180" : ""
            }`}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold tracking-tight">
            {isRtl ? "الشروط والأحكام" : "Terms and Conditions"}
          </h2>
        </div>

        <div className="bg-theme-card border border-theme-border rounded-3xl p-8 space-y-6 max-w-none shadow-sm transition-colors duration-300">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {isRtl ? "1. قبول الشروط" : "1. Acceptance of Terms"}
              </h3>
              <p className="text-theme-text-muted leading-relaxed mt-2">
                {isRtl
                  ? "باستخدامك لتطبيق SmartyAi، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى عدم استخدام التطبيق."
                  : "By using the SmartyAi application, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, please do not use the application."}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {isRtl ? "2. وصف الخدمة" : "2. Service Description"}
              </h3>
              <p className="text-theme-text-muted leading-relaxed mt-2">
                {isRtl
                  ? "SmartyAi هو نظام لإدارة الطلبات الذكية باستخدام الذكاء الاصطناعي، مصمم خصيصاً للتجار الجزائريين لتفكيك طلبات وسائل التواصل الاجتماعي وإدارة الشحنات."
                  : "SmartyAi is an intelligent order management system using artificial intelligence, specifically designed for Algerian merchants to extract social media orders and manage shipments."}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {isRtl ? "3. الحسابات والاشتراكات" : "3. Accounts and Subscriptions"}
              </h3>
              <p className="text-theme-text-muted leading-relaxed mt-2">
                {isRtl
                  ? "يتطلب الوصول إلى الميزات المتقدمة اشتراكاً مدفوعاً. أنت مسؤول عن الحفاظ على سرية معلومات حسابك وجميع الأنشطة التي تحدث تحت حسابك."
                  : "Access to advanced features requires a paid subscription. You are responsible for maintaining the confidentiality of your account information and all activities that occur under your account."}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {isRtl ? "4. الدفع والفواتير" : "4. Payment and Billing"}
              </h3>
              <p className="text-theme-text-muted leading-relaxed mt-2">
                {isRtl
                  ? "يتم الدفع عبر البوابة الإلكترونية Chargily Pay (بطاقات CIB أو Edahabia). جميع المبالغ بالدينار الجزائري (DZD) وهي غير قابلة للاسترداد بعد تفعيل الخدمة."
                  : "Payments are processed through the Chargily Pay gateway (CIB or Edahabia cards). All amounts are in Algerian Dinar (DZD) and are non-refundable after service activation."}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {isRtl ? "5. حدود المسؤولية" : "5. Limitation of Liability"}
              </h3>
              <p className="text-theme-text-muted leading-relaxed mt-2">
                {isRtl
                  ? "لن تكون شركة SmartyAi مسؤولة عن أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية ناتجة عن استخدامك للخدمة أو عدم القدرة على استخدامها."
                  : "SmartyAi shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service."}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {isRtl ? "6. تعديلات الشروط" : "6. Modifications of Terms"}
              </h3>
              <p className="text-theme-text-muted leading-relaxed mt-2">
                {isRtl
                  ? "نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم إشعارك بأي تغييرات جوهرية، ويعتبر استمرارك في استخدام الخدمة بمثابة قبولك للشروط المعدلة."
                  : "We reserve the right to modify these terms at any time. You will be notified of any material changes, and your continued use of the service constitutes acceptance of the modified terms."}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {isRtl ? "7. القانون الحاكم" : "7. Governing Law"}
              </h3>
              <p className="text-theme-text-muted leading-relaxed mt-2">
                {isRtl
                  ? "تخضع هذه الشروط وتفسر وفقاً لقوانين الجمهورية الجزائرية الديمقراطية الشعبية."
                  : "These terms shall be governed by and construed in accordance with the laws of the People's Democratic Republic of Algeria."}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {isRtl ? "8. اتصل بنا" : "8. Contact Us"}
              </h3>
              <p className="text-theme-text-muted leading-relaxed mt-2">
                {isRtl
                  ? "لأي استفسار بخصوص هذه الشروط، يرجى التواصل معنا عبر البريد الإلكتروني: smarty@smartyai.net"
                  : "For any questions regarding these terms, please contact us at: smarty@smartyai.net"}
              </p>
            </div>
          </div>

          <div className="pt-4 text-center text-zinc-500 text-xs border-t border-theme-border">
            <p>
              {isRtl
                ? `آخر تحديث: ${new Date().toLocaleDateString("ar-EG")}`
                : `Last updated: ${new Date().toLocaleDateString("en-US")}`}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
