import { Plus } from 'lucide-react';
import { Link } from 'react-router';
import { Container } from '@/components/layout/container';
import { SectionHeading } from '@/components/layout/section-heading';
import { Reveal } from '@/components/motion/reveal';
import { motion } from '@/styles/tokens';
import { faqs } from './home-content';

/** Native <details> keeps the FAQ accessible and usable before any JavaScript loads. */
export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="scroll-mt-20 py-16 sm:py-24 lg:py-28">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <Reveal>
          <SectionHeading
            id="faq-heading"
            eyebrow="FAQs"
            title="Questions, answered"
            description={
              <>
                Can't find what you're looking for?{' '}
                <Link to="/contact" className="link-underline font-medium text-primary">
                  Get in touch
                </Link>
                .
              </>
            }
          />
        </Reveal>

        <Reveal delay={motion.stagger * 2}>
          <div className="divide-y divide-line border-y border-line">
            {faqs.map((faq) => (
              <details key={faq.question} className="group">
                <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-lg font-medium transition-colors duration-120 hover:text-primary [&::-webkit-details-marker]:hidden">
                  {faq.question}
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border border-line transition-transform duration-320 ease-out group-open:rotate-45"
                  >
                    <Plus className="size-4" />
                  </span>
                </summary>
                <p className="max-w-2xl animate-fade-up pb-6 text-muted">{faq.answer}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
