'use client';

import { useLanguage } from '@/components/LanguageContext';

export default function PrivacyPage() {
  const { language, isRTL } = useLanguage();
  const contactEmail = "smarty7app@gmail.com";

  // الترجمة حسب اللغة
  const t = {
    title: {
      ar: 'سياسة الخصوصية لتطبيق Smarty',
      en: 'Smarty App Privacy Policy',
      fr: 'Politique de confidentialité de Smarty'
    },
    lastUpdated: {
      ar: 'تاريخ آخر تحديث: 13 أبريل 2026',
      en: 'Last updated: April 13, 2026',
      fr: 'Dernière mise à jour : 13 avril 2026'
    },
    sections: {
      intro: {
        title: { ar: '1. مقدمة', en: '1. Introduction', fr: '1. Introduction' },
        content: {
          ar: 'نحن في Smarty نلتزم بحماية خصوصية بياناتك. توضح هذه السياسة كيفية جمع واستخدام وحماية معلوماتك عند استخدام تطبيقنا الذكي لإدارة التذكيرات.',
          en: 'At Smarty, we are committed to protecting your data privacy. This policy explains how we collect, use, and protect your information when using our smart reminder management app.',
          fr: 'Chez Smarty, nous nous engageons à protéger la confidentialité de vos données. Cette politique explique comment nous collectons, utilisons et protégeons vos informations lorsque vous utilisez notre application intelligente de gestion de rappels.'
        }
      },
      infoCollected: {
        title: { ar: '2. المعلومات التي نجمعها', en: '2. Information We Collect', fr: '2. Informations que nous collectons' },
        items: {
          account: {
            ar: 'معلومات الحساب: عندما تسجل الدخول عبر Google، نحصل على اسمك وعنوان بريدك الإلكتروني.',
            en: 'Account information: When you sign in with Google, we receive your name and email address.',
            fr: 'Informations du compte : lorsque vous vous connectez avec Google, nous recevons votre nom et votre adresse e-mail.'
          },
          reminders: {
            ar: 'بيانات التذكيرات: النصوص التي تكتبها والتذكيرات التي تنشئها داخل التطبيق.',
            en: 'Reminder data: The texts you write and the reminders you create within the app.',
            fr: 'Données de rappel : les textes que vous écrivez et les rappels que vous créez dans l\'application.'
          },
          usage: {
            ar: 'بيانات الاستخدام: معلومات حول كيفية تفاعلك مع التطبيق، مثل الميزات التي تستخدمها.',
            en: 'Usage data: Information about how you interact with the app, such as the features you use.',
            fr: 'Données d\'utilisation : informations sur la façon dont vous interagissez avec l\'application, comme les fonctionnalités que vous utilisez.'
          },
          device: {
            ar: 'بيانات الجهاز: معلومات تقنية مثل عنوان IP ونوع المتصفح.',
            en: 'Device data: Technical information such as IP address and browser type.',
            fr: 'Données de l\'appareil : informations techniques telles que l\'adresse IP et le type de navigateur.'
          }
        }
      },
      useOfInfo: {
        title: { ar: '3. كيفية استخدام معلوماتك', en: '3. How We Use Your Information', fr: '3. Comment nous utilisons vos informations' },
        content: {
          ar: 'نستخدم المعلومات التي نجمعها للأغراض التالية: توفير وتحسين خدمة التذكيرات الذكية، تخصيص تجربتك، التواصل معك بخصوص التحديثات الهامة، وتحليل أداء التطبيق.',
          en: 'We use the information we collect for the following purposes: to provide and improve smart reminder services, personalize your experience, communicate important updates, and analyze app performance.',
          fr: 'Nous utilisons les informations que nous collectons aux fins suivantes : fournir et améliorer les services de rappel intelligent, personnaliser votre expérience, communiquer des mises à jour importantes et analyser les performances de l\'application.'
        }
      },
      sharing: {
        title: { ar: '4. مشاركة المعلومات', en: '4. Information Sharing', fr: '4. Partage d\'informations' },
        content: {
          ar: 'نحن لا نبيع أو نؤجر معلوماتك الشخصية للغير. قد نشارك بيانات مجمعة وغير محددة للهوية مع شركاء موثوقين لتحسين خدماتنا. قد نضطر للكشف عن معلوماتك إذا كان ذلك مطلوباً بموجب القانون.',
          en: 'We do not sell or rent your personal information to third parties. We may share aggregated, non-personally identifiable data with trusted partners to improve our services. We may disclose your information if required by law.',
          fr: 'Nous ne vendons ni ne louons vos informations personnelles à des tiers. Nous pouvons partager des données agrégées et non personnelles avec des partenaires de confiance pour améliorer nos services. Nous pouvons divulguer vos informations si la loi l\'exige.'
        }
      },
      security: {
        title: { ar: '5. أمان البيانات', en: '5. Data Security', fr: '5. Sécurité des données' },
        content: {
          ar: 'نحن نتخذ إجراءات أمنية معقولة لحماية معلوماتك من الوصول أو الاستخدام أو الكشف غير المصرح به.',
          en: 'We take reasonable security measures to protect your information from unauthorized access, use, or disclosure.',
          fr: 'Nous prenons des mesures de sécurité raisonnables pour protéger vos informations contre tout accès, utilisation ou divulgation non autorisés.'
        }
      },
      children: {
        title: { ar: '6. خصوصية الأطفال', en: '6. Children\'s Privacy', fr: '6. Vie privée des enfants' },
        content: {
          ar: 'تطبيق Smarty غير موجه للأطفال دون سن 13 عاماً. نحن لا نقوم عمداً بجمع معلومات شخصية من الأطفال.',
          en: 'Smarty is not intended for children under 13. We do not knowingly collect personal information from children.',
          fr: 'Smarty n\'est pas destiné aux enfants de moins de 13 ans. Nous ne collectons pas sciemment d\'informations personnelles auprès d\'enfants.'
        }
      },
      rights: {
        title: { ar: '7. حقوقك', en: '7. Your Rights', fr: '7. Vos droits' },
        content: {
          ar: 'حسب موقعك الجغرافي، قد يكون لك حقوق معينة فيما يتعلق ببياناتك الشخصية، مثل الحق في الوصول إلى بياناتك أو تصحيحها أو حذفها.',
          en: 'Depending on your location, you may have certain rights regarding your personal data, such as the right to access, correct, or delete your data.',
          fr: 'Selon votre emplacement géographique, vous pouvez avoir certains droits concernant vos données personnelles, tels que le droit d\'accéder, de corriger ou de supprimer vos données.'
        }
      },
      changes: {
        title: { ar: '8. التغييرات على سياسة الخصوصية', en: '8. Changes to Privacy Policy', fr: '8. Modifications de la politique de confidentialité' },
        content: {
          ar: 'قد نقوم بتحديث سياسة الخصوصية من وقت لآخر. سنقوم بإشعارك بأي تغييرات جوهرية عبر نشر السياسة الجديدة على هذه الصفحة.',
          en: 'We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on this page.',
          fr: 'Nous pouvons mettre à jour cette politique de confidentialité de temps à autre. Nous vous informerons de tout changement important en publiant la nouvelle politique sur cette page.'
        }
      },
      contact: {
        title: { ar: '9. اتصل بنا', en: '9. Contact Us', fr: '9. Contactez-nous' },
        content: {
          ar: `إذا كان لديك أي أسئلة حول سياسة الخصوصية، يرجى الاتصال بنا على البريد الإلكتروني:`,
          en: `If you have any questions about this privacy policy, please contact us at:`,
          fr: `Si vous avez des questions concernant cette politique de confidentialité, veuillez nous contacter à :`
        }
      }
    }
  };

  const getText = (obj: any) => obj[language as keyof typeof obj] || obj.en;

  return (
    <div className="min-h-screen bg-[#E65100] p-6 md:p-10" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl p-6 md:p-10 text-zinc-800 dark:text-zinc-200">
        <h1 className="text-3xl font-black text-[#E65100] mb-6">{getText(t.title)}</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">{getText(t.lastUpdated)}</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.intro.title)}</h2>
            <p>{getText(t.sections.intro.content)}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.infoCollected.title)}</h2>
            <ul className="list-disc pr-6 space-y-2">
              <li><span className="font-semibold">{getText(t.sections.infoCollected.items.account).split(':')[0]}:</span> {getText(t.sections.infoCollected.items.account).split(':')[1]}</li>
              <li><span className="font-semibold">{getText(t.sections.infoCollected.items.reminders).split(':')[0]}:</span> {getText(t.sections.infoCollected.items.reminders).split(':')[1]}</li>
              <li><span className="font-semibold">{getText(t.sections.infoCollected.items.usage).split(':')[0]}:</span> {getText(t.sections.infoCollected.items.usage).split(':')[1]}</li>
              <li><span className="font-semibold">{getText(t.sections.infoCollected.items.device).split(':')[0]}:</span> {getText(t.sections.infoCollected.items.device).split(':')[1]}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.useOfInfo.title)}</h2>
            <p>{getText(t.sections.useOfInfo.content)}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.sharing.title)}</h2>
            <p>{getText(t.sections.sharing.content)}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.security.title)}</h2>
            <p>{getText(t.sections.security.content)}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.children.title)}</h2>
            <p>{getText(t.sections.children.content)}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.rights.title)}</h2>
            <p>{getText(t.sections.rights.content)}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.changes.title)}</h2>
            <p>{getText(t.sections.changes.content)}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.contact.title)}</h2>
            <p>
              {getText(t.sections.contact.content)}{' '}
              <a href={`mailto:${contactEmail}`} className="text-[#E65100] hover:underline">
                {contactEmail}
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
