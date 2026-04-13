export default function PrivacyPage() {
  // يمكنك تغيير هذه القيم لاحقًا
  const contactEmail = "smarty7app@gmail.com";

  return (
    <div className="min-h-screen bg-[#E65100] p-6 md:p-10" dir="rtl">
      <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-6 md:p-10 text-zinc-800 dark:text-zinc-200">
        <h1 className="text-3xl font-black text-[#E65100] mb-6">سياسة الخصوصية لتطبيق Smarty</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">تاريخ آخر تحديث: 13 أبريل 2026</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-bold mb-3">1. مقدمة</h2>
            <p>نحن في Smarty نلتزم بحماية خصوصية بياناتك. توضح هذه السياسة كيفية جمع واستخدام وحماية معلوماتك عند استخدام تطبيقنا الذكي لإدارة التذكيرات.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">2. المعلومات التي نجمعها</h2>
            <ul className="list-disc pr-6 space-y-2">
              <li><span className="font-semibold">معلومات الحساب:</span> عندما تسجل الدخول عبر Google، نحصل على اسمك وعنوان بريدك الإلكتروني.</li>
              <li><span className="font-semibold">بيانات التذكيرات:</span> النصوص التي تكتبها والتذكيرات التي تنشئها داخل التطبيق.</li>
              <li><span className="font-semibold">بيانات الاستخدام:</span> معلومات حول كيفية تفاعلك مع التطبيق، مثل الميزات التي تستخدمها.</li>
              <li><span className="font-semibold">بيانات الجهاز:</span> معلومات تقنية مثل عنوان IP ونوع المتصفح.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">3. كيفية استخدام معلوماتك</h2>
            <p>نستخدم المعلومات التي نجمعها للأغراض التالية: توفير وتحسين خدمة التذكيرات الذكية، تخصيص تجربتك، التواصل معك بخصوص التحديثات الهامة، وتحليل أداء التطبيق.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">4. مشاركة المعلومات</h2>
            <p>نحن لا نبيع أو نؤجر معلوماتك الشخصية للغير. قد نشارك بيانات مجمعة وغير محددة للهوية مع شركاء موثوقين لتحسين خدماتنا. قد نضطر للكشف عن معلوماتك إذا كان ذلك مطلوباً بموجب القانون.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">5. أمان البيانات</h2>
            <p>نحن نتخذ إجراءات أمنية معقولة لحماية معلوماتك من الوصول أو الاستخدام أو الكشف غير المصرح به.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">6. خصوصية الأطفال</h2>
            <p>تطبيق Smarty غير موجه للأطفال دون سن 13 عاماً. نحن لا نقوم عمداً بجمع معلومات شخصية من الأطفال.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">7. حقوقك</h2>
            <p>حسب موقعك الجغرافي، قد يكون لك حقوق معينة فيما يتعلق ببياناتك الشخصية، مثل الحق في الوصول إلى بياناتك أو تصحيحها أو حذفها.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">8. التغييرات على سياسة الخصوصية</h2>
            <p>قد نقوم بتحديث سياسة الخصوصية من وقت لآخر. سنقوم بإشعارك بأي تغييرات جوهرية عبر نشر السياسة الجديدة على هذه الصفحة.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">9. اتصل بنا</h2>
            <p>إذا كان لديك أي أسئلة حول سياسة الخصوصية، يرجى الاتصال بنا على البريد الإلكتروني: <a href={`mailto:${contactEmail}`} className="text-[#E65100] hover:underline">{contactEmail}</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}
