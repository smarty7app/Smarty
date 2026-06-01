import { ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export default function PrivacyPolicy({ setScreen, t, isRtl }: any) {
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
      className="min-h-screen bg-[#050505] text-white p-6 pt-24 pb-16 font-sans"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBackToDashboard}
            className={`p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors ${
              isRtl ? "rotate-180" : ""
            }`}
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold tracking-tight">
            {isRtl ? "سياسة الخصوصية" : "Privacy Policy"}
          </h2>
        </div>

        <div className="bg-zinc-900/30 border border-zinc-800 rounded-3xl p-8 space-y-6 prose prose-invert max-w-none">
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-blue-400">
                {isRtl ? "1. جمع المعلومات" : "1. Information Collection"}
              </h3>
              <p className="text-zinc-300 leading-relaxed mt-2">
                {isRtl
                  ? "نقوم بجمع المعلومات التي تقدمها لنا عند إنشاء حساب، مثل الاسم والبريد الإلكتروني ورقم الهاتف. كما نجمع معلومات الطلبات التي تقوم بمعالجتها عبر النظام، بالإضافة إلى بيانات الاستخدام مثل عنوان IP ونوع المتصفح."
                  : "We collect information you provide to us when creating an account, such as name, email address, and phone number. We also collect order information you process through the system, as well as usage data such as IP address and browser type."}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-blue-400">
                {isRtl ? "2. استخدام المعلومات" : "2. Use of Information"}
              </h3>
              <p className="text-zinc-300 leading-relaxed mt-2">
                {isRtl
                  ? "نستخدم المعلومات التي نجمعها لتشغيل وتحسين خدماتنا، ومعالجة طلباتك، والتواصل معك بخصوص حسابك أو العروض الجديدة، وتحسين تجربة المستخدم بشكل عام."
                  : "We use the information we collect to operate and improve our services, process your orders, communicate with you about your account or new offers, and generally improve the user experience."}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-blue-400">
                {isRtl ? "3. مشاركة المعلومات" : "3. Information Sharing"}
              </h3>
              <p className="text-zinc-300 leading-relaxed mt-2">
                {isRtl
                  ? "لا نقوم ببيع أو تأجير معلوماتك الشخصية للغير. قد نشارك معلوماتك مع شركات التوصيل التابعة لجهات خارجية لمعالجة شحناتك، أو مع مزودي خدمات الدفع (مثل Chargily Pay) لإتمام عمليات الدفع، وذلك وفقاً لسياسات الخصوصية الخاصة بهم."
                  : "We do not sell or rent your personal information to third parties. We may share your information with third-party shipping carriers to process your shipments, or with payment service providers (e.g., Chargily Pay) to complete payment transactions, in accordance with their privacy policies."}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-blue-400">
                {isRtl ? "4. أمان البيانات" : "4. Data Security"}
              </h3>
              <p className="text-zinc-300 leading-relaxed mt-2">
                {isRtl
                  ? "نحن نتخذ إجراءات أمنية تقنية وتنظيمية مناسبة لحماية معلوماتك من الوصول غير المصرح به أو التعديل أو الإفصاح أو التدمير، بما في ذلك استخدام التشفير والمصادقة الآمنة."
                  : "We implement appropriate technical and organizational security measures to protect your information from unauthorized access, alteration, disclosure, or destruction, including encryption and secure authentication."}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-blue-400">
                {isRtl ? "5. حقوقك" : "5. Your Rights"}
              </h3>
              <p className="text-zinc-300 leading-relaxed mt-2">
                {isRtl
                  ? "يحق لك الوصول إلى معلوماتك الشخصية وتصحيحها أو حذفها، وكذلك الاعتراض على معالجتها أو تقييدها في ظل ظروف معينة. يمكنك ممارسة هذه الحقوق عن طريق الاتصال بنا."
                  : "You have the right to access, correct, or delete your personal information, as well as to object to or restrict its processing under certain circumstances. You may exercise these rights by contacting us."}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-blue-400">
                {isRtl ? "6. ملفات تعريف الارتباط (Cookies)" : "6. Cookies"}
              </h3>
              <p className="text-zinc-300 leading-relaxed mt-2">
                {isRtl
                  ? "نحن نستخدم ملفات تعريف الارتباط لتحسين تجربتك على موقعنا. يمكنك تعيين متصفحك لرفض ملفات تعريف الارتباط، ولكن هذا قد يحد من وظائف التطبيق."
                  : "We use cookies to enhance your experience on our site. You can set your browser to refuse cookies, but this may limit the functionality of the application."}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-blue-400">
                {isRtl ? "7. الخصوصية والالتزام القانوني" : "7. Privacy and Legal Compliance"}
              </h3>
              <p className="text-zinc-300 leading-relaxed mt-2">
                {isRtl
                  ? "نلتزم باحترام خصوصية المستخدمين والامتثال للتشريعات الوطنية والدولية لحماية البيانات."
                  : "We are committed to respecting user privacy and complying with national and international data protection regulations."}
              </p>
            </div>

            <div>
              <h3 className="text-lg font-bold text-blue-400">
                {isRtl ? "8. اتصل بنا" : "8. Contact Us"}
              </h3>
              <p className="text-zinc-300 leading-relaxed mt-2">
                {isRtl
                  ? "إذا كانت لديك أي أسئلة حول سياسة الخصوصية هذه، يرجى الاتصال بنا على: support@smartyai.com"
                  : "If you have any questions about this Privacy Policy, please contact us at: support@smartyai.com"}
              </p>
            </div>
          </div>

          <div className="pt-4 text-center text-zinc-500 text-xs border-t border-zinc-800">
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
