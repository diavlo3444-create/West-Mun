import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useInView } from '../hooks/useInView';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export const FAQSection: React.FC = React.memo(() => {
  const { ref, isInView } = useInView<HTMLElement>();
  const [openId, setOpenId] = useState<string | null>('faq-1');

  const faqs: FAQItem[] = [
    {
      id: 'faq-1',
      question: 'What is WEST MUN?',
      answer:
        'WEST MUN (Western Model United Nations) is an academic conference simulating the United Nations and associated multilateral organs. Student delegates act as diplomats representing designated countries, researching international issues, negotiating policies, and authoring formal resolutions.',
    },
    {
      id: 'faq-2',
      question: 'Who can participate?',
      answer:
        'WEST MUN welcomes high school and university students with an interest in international relations, debate, politics, law, and diplomacy. Both individual delegates (independent registrations) and school delegations accompanied by faculty advisors are eligible to register.',
    },
    {
      id: 'faq-3',
      question: 'Do I need previous MUN experience?',
      answer:
        'No prior Model UN experience is required. The conference features committees tailored across skill levels, ranging from beginner-friendly General Assembly rooms with dais guidance to fast-paced advanced crisis simulations. Introductory procedure briefings are held during Day 1.',
    },
    {
      id: 'faq-4',
      question: 'What should delegates prepare prior to the conference?',
      answer:
        'Delegates should thoroughly study their committee’s official Background Guide, research their assigned nation’s foreign policy and treaty record, and prepare a written Position Paper. Delegates will also benefit from practicing speeches and familiarizing themselves with the Rules of Procedure.',
    },
    {
      id: 'faq-5',
      question: 'What are the registration fees?',
      answer:
        'Official registration fees for delegates, delegations, and faculty advisors are To Be Announced (TBA). The Secretariat is committed to keeping registration accessible and will announce final pricing alongside early-bird deadlines prior to open enrollment.',
    },
    {
      id: 'faq-6',
      question: 'When and where will the conference take place?',
      answer:
        'The official conference dates and host venue/city are To Be Announced (TBA). The Secretariat is finalizing agreements with partner educational facilities and will release the confirmed schedule on this website.',
    },
    {
      id: 'faq-7',
      question: 'How can I contact the organizing team?',
      answer:
        'Official secretariat contact email and communication channels are To Be Announced (TBA). In the interim, delegates and faculty may submit pre-registration alerts or message inquiries through our on-page Contact section below.',
    },
  ];

  const toggleFAQ = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="faq" ref={ref} className="relative z-20 py-24 sm:py-32 bg-[#0a0a0c] text-white border-t border-neutral-900">
      <div
        className={`max-w-4xl mx-auto px-5 sm:px-8 md:px-12 transition-all duration-1000 ease-out transform ${
          isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-8 h-[1px] bg-[#d4af37]" />
            <span className="text-xs uppercase tracking-widest text-[#d4af37] font-semibold">
              Delegate Knowledge Base
            </span>
            <span className="w-8 h-[1px] bg-[#d4af37]" />
          </div>
          <h2
            className="text-3xl sm:text-5xl font-serif font-normal text-white tracking-tight leading-tight mb-4"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Frequently Asked <span className="gold-gradient-text">Questions</span>
          </h2>
          <p className="text-neutral-400 text-sm max-w-xl mx-auto font-light leading-relaxed">
            Essential guidelines for prospective delegates, faculty advisors, and institutional partners preparing for WEST MUN.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-4">
          {faqs.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <div
                key={faq.id}
                className="bg-[#0e0e11] border border-neutral-800/90 rounded-sm overflow-hidden transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(faq.id)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${faq.id}`}
                  className="w-full py-5 px-6 sm:px-8 flex items-center justify-between text-left gap-4 hover:bg-[#131317] transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#d4af37]/40"
                >
                  <span className="text-base sm:text-lg font-serif text-white font-medium">
                    {faq.question}
                  </span>
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center border border-neutral-700 shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180 bg-[#d4af37] text-black border-[#d4af37]' : 'text-neutral-400'
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                <div
                  id={`faq-answer-${faq.id}`}
                  className={`px-6 sm:px-8 transition-all duration-300 ease-in-out overflow-hidden ${
                    isOpen ? 'max-h-96 pb-6 pt-2 opacity-100' : 'max-h-0 pb-0 pt-0 opacity-0'
                  }`}
                >
                  <div className="pt-2 border-t border-neutral-800/70 text-sm text-neutral-300 leading-relaxed font-light">
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
});
FAQSection.displayName = 'FAQSection';
