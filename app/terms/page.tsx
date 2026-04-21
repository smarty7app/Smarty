'use client';

import { useLanguage } from '@/components/LanguageContext';

export default function TermsPage() {
  const { language, isRTL } = useLanguage();
  const contactEmail = "smarty7app@gmail.com";

  const t = {
    title: {
      ar: 'شروط استخدام تطبيق Smarty',
      en: 'Smarty App Terms of Use',
      fr: "Conditions d'utilisation de l'application Smarty"
    },
    lastUpdated: {
      ar: 'تاريخ آخر تحديث: 13 أبريل 2026',
      en: 'Last updated: April 13, 2026',
      fr: 'Dernière mise à jour : 13 avril 2026'
    },
    sections: {
      acceptance: {
        title: { ar: '1. الموافقة على الشروط', en: '1. Acceptance of Terms', fr: "1. Acceptation des conditions" },
        content: {
          ar: 'باستخدامك لتطبيق Smarty، فإنك توافق على الالتزام بشروط الاستخدام هذه.',
          en: 'By using Smarty, you agree to be bound by these Terms of Use.',
          fr: "En utilisant Smarty, vous acceptez d'être lié par ces conditions d'utilisation."
        }
      },
      use: {
        title: { ar: '2. استخدام التطبيق', en: '2. Use of the App', fr: "2. Utilisation de l'application" },
        content: {
          ar: 'يُسمح لك باستخدام التطبيق لإدارة تذكيراتك ومواعيدك الشخصية. أنت توافق على استخدام التطبيق بطريقة قانونية وأخلاقية، وعدم إساءة استخدامه أو محاولة اختراقه أو تعطيله.',
          en: 'You are permitted to use the app to manage your personal reminders and appointments. You agree to use the app in a lawful and ethical manner, and not to misuse, hack, or disrupt it.',
          fr: "Vous êtes autorisé à utiliser l'application pour gérer vos rappels et rendez-vous personnels. Vous acceptez d'utiliser l'application de manière légale et éthique, et de ne pas en abuser, la pirater ou la perturber."
        }
      },
      accounts: {
        title: { ar: '3. الحسابات', en: '3. Accounts', fr: '3. Comptes' },
        content: {
          ar: 'أنت مسؤول عن الحفاظ على سرية معلومات حسابك وجميع الأنشطة التي تحدث من خلاله. يجب عليك إخطارنا فوراً بأي استخدام غير مصرح به لحسابك.',
          en: 'You are responsible for maintaining the confidentiality of your account information and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.',
          fr: "Vous êtes responsable de la confidentialité des informations de votre compte et de toutes les activités qui s'y déroulent. Vous devez nous informer immédiatement de toute utilisation non autorisée de votre compte."
        }
      },
      intellectual: {
        title: { ar: '4. الملكية الفكرية', en: '4. Intellectual Property', fr: '4. Propriété intellectuelle' },
        content: {
          ar: 'التطبيق ومحتواه الأصلي وميزاته ووظائفه مملوكة لـ Smarty ومحمية بموجب قوانين حقوق النشر والعلامات التجارية وقوانين الملكية الفكرية الأخرى.',
          en: 'The app and its original content, features, and functionality are owned by Smarty and are protected by copyright, trademark, and other intellectual property laws.',
          fr: "L'application et son contenu original, ses fonctionnalités sont la propriété de Smarty et sont protégés par les lois sur le droit d'auteur, les marques commerciales et autres lois sur la propriété intellectuelle."
        }
      },
      ai: {
        title: { ar: '5. الذكاء الاصطناعي والمحتوى المُنشأ', en: '5. Artificial Intelligence and Generated Content', fr: "5. Intelligence artificielle et contenu généré" },
        content: {
          ar: 'يستخدم Smarty تقنيات الذكاء الاصطناعي للمساعدة في إنشاء التذكيرات وتحليلها. بينما نسعى للدقة، قد لا تكون المخرجات خالية من الأخطاء. أنت تتحمل المسؤولية النهائية عن دقة وملاءمة التذكيرات التي تنشئها.',
          en: 'Smarty uses AI technologies to assist in creating and analyzing reminders. While we strive for accuracy, outputs may not be error-free. You bear ultimate responsibility for the accuracy and appropriateness of the reminders you create.',
          fr: "Smarty utilise des technologies d'IA pour aider à créer et analyser les rappels. Bien que nous nous efforçons d'être précis, les résultats peuvent ne pas être exempts d'erreurs. Vous assumez l'entière responsabilité de l'exactitude et de la pertinence des rappels que vous créez."
        }
      },
      externalLinks: {
        title: { ar: '6. الروابط الخارجية', en: '6. External Links', fr: '6. Liens externes' },
        content: {
          ar: 'قد يحتوي التطبيق على روابط لمواقع أو خدمات خارجية لا نمتلكها أو نتحكم بها. نحن لسنا مسؤولين عن محتوى أو ممارسات الخصوصية لأي أطراف ثالثة.',
          en: 'The app may contain links to external websites or services that we do not own or control. We are not responsible for the content or privacy practices of any third parties.',
          fr: "L'application peut contenir des liens vers des sites Web ou des services externes que nous ne possédons ni ne contrôlons. Nous ne sommes pas responsables du contenu ou des pratiques de confidentialité des tiers."
        }
      },
      termination: {
        title: { ar: '7. الإنهاء', en: '7. Termination', fr: '7. Résiliation' },
        content: {
          ar: 'نحتفظ بالحق في إنهاء أو تعليق وصولك إلى التطبيق فوراً، دون إشعار مسبق، لأي سبب كان، بما في ذلك انتهاكك لشروط الاستخدام.',
          en: 'We reserve the right to terminate or suspend your access to the app immediately, without prior notice, for any reason, including your breach of these Terms.',
          fr: "Nous nous réservons le droit de résilier ou de suspendre immédiatement votre accès à l'application, sans préavis, pour quelque raison que ce soit, y compris votre violation des présentes conditions."
        }
      },
      warranty: {
        title: { ar: '8. إخلاء المسؤولية عن الضمان', en: '8. Disclaimer of Warranty', fr: "8. Clause de non-garantie" },
        content: {
          ar: 'يتم توفير التطبيق "كما هو" و"كما هو متاح" دون أي ضمانات من أي نوع، سواء كانت صريحة أو ضمنية.',
          en: 'The app is provided "as is" and "as available" without any warranties of any kind, either express or implied.',
          fr: "L'application est fournie « telle quelle » et « selon disponibilité » sans aucune garantie d'aucune sorte, expresse ou implicite."
        }
      },
      liability: {
        title: { ar: '9. تحديد المسؤولية', en: '9. Limitation of Liability', fr: '9. Limitation de responsabilité' },
        content: {
          ar: 'في أي حال من الأحوال، لا تكون Smarty مسؤولة عن أي أضرار غير مباشرة أو عرضية أو خاصة أو تبعية ناتجة عن استخدامك للتطبيق.',
          en: 'In no event shall Smarty be liable for any indirect, incidental, special, or consequential damages arising out of your use of the app.',
          fr: "En aucun cas, Smarty ne pourra être tenu responsable de tout dommage indirect, accessoire, spécial ou consécutif découlant de votre utilisation de l'application."
        }
      },
      governingLaw: {
        title: { ar: '10. القانون الحاكم', en: '10. Governing Law', fr: '10. Droit applicable' },
        content: {
          ar: 'تخضع شروط الاستخدام هذه وتفسر وفقاً لقوانين الجزائر، دون النظر إلى تعارض مبادئ القانون.',
          en: 'These Terms shall be governed and construed in accordance with the laws of Algeria, without regard to its conflict of law provisions.',
          fr: "Les présentes conditions sont régies et interprétées conformément aux lois de l'Algérie, sans égard aux principes de conflit de lois."
        }
      },
      contact: {
        title: { ar: '11. اتصل بنا', en: '11. Contact Us', fr: '11. Contactez-nous' },
        content: {
          ar: `إذا كان لديك أي استفسار بخصوص شروط الاستخدام، يرجى الاتصال بنا على البريد الإلكتروني:`,
          en: `If you have any questions about these Terms, please contact us at:`,
          fr: `Si vous avez des questions concernant ces conditions, veuillez nous contacter à :`
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
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.acceptance.title)}</h2>
            <p>{getText(t.sections.acceptance.content)}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.use.title)}</h2>
            <p>{getText(t.sections.use.content)}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.accounts.title)}</h2>
            <p>{getText(t.sections.accounts.content)}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.intellectual.title)}</h2>
            <p>{getText(t.sections.intellectual.content)}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.ai.title)}</h2>
            <p>{getText(t.sections.ai.content)}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.externalLinks.title)}</h2>
            <p>{getText(t.sections.externalLinks.content)}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.termination.title)}</h2>
            <p>{getText(t.sections.termination.content)}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.warranty.title)}</h2>
            <p>{getText(t.sections.warranty.content)}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.liability.title)}</h2>
            <p>{getText(t.sections.liability.content)}</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-3">{getText(t.sections.governingLaw.title)}</h2>
            <p>{getText(t.sections.governingLaw.content)}</p>
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
