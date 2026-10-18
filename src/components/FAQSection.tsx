import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';
import { useInView } from '../hooks/useInView';
import { usePublicTable, DEFAULT_FAQ, type FaqRow } from '../lib/content';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export const FAQSection: React.FC = React.memo(() => {
  const { ref, isInView } = useInView<HTMLElement>();
  const [pickedId, setPickedId] = useState<string | null | undefined>(undefined);

  const faqs: FAQItem[] = usePublicTable<FaqRow>('faq', DEFAULT_FAQ);

  // undefined = nothing clicked yet, so the first question is open by default
  const openId = pickedId === undefined ? faqs[0]?.id ?? null : pickedId;
  const toggleFAQ = (id: string) => {
    setPickedId(openId === id ? null : id);
  };

  return (
    <section id="faq" ref={ref} className="section-content-visibility relative z-20 py-24 sm:py-32 bg-[#0a0a0c] text-white border-t border-neutral-900">
      <div className="max-w-4xl mx-auto px-5 sm:px-8 md:px-12">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-16"
        >
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
        </motion.div>

        {/* Accordion */}
        <div className="space-y-4">
          {faqs.length === 0 && <p className="text-center text-sm text-neutral-500">No questions published yet.</p>}
          {faqs.map((faq, index) => {
            const isOpen = openId === faq.id;
            return (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                transition={{
                  duration: 0.45,
                  delay: Math.min(index * 0.06, 0.45),
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                whileHover={{ y: -2, transition: { duration: 0.15 } }}
                className="bg-[#0e0e11] border border-neutral-800/90 hover:border-neutral-700 rounded-sm overflow-hidden transition-colors"
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
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                  }`}
                >
                  <div className="overflow-hidden px-6 sm:px-8">
                    <div className="pt-2 pb-6 border-t border-neutral-800/70 text-sm text-neutral-300 leading-relaxed font-light">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
});
FAQSection.displayName = 'FAQSection';
