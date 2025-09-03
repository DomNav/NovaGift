import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorageFlag } from '../hooks/useLocalStorage';

export default function Guide() {
  const navigate = useNavigate();
  const [hideGuide, setHideGuide] = useLocalStorageFlag('nv.guide.hidden', false, {
    requireConsent: true,
    expiryMs: 90 * 24 * 60 * 60 * 1000 // 90 days
  });
  
  const [showContent, setShowContent] = useState(!hideGuide);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Redirect if user has hidden guide and this isn't a direct navigation
  useEffect(() => {
    if (hideGuide && window.history.length > 1) {
      navigate('/studio', { replace: true });
    }
  }, [hideGuide, navigate]);

  const handleHideGuide = (checked: boolean) => {
    setHideGuide(checked);
    if (checked) {
      // Delay navigation to show the UI change
      setTimeout(() => navigate('/studio', { replace: true }), 500);
    }
  };

  const sections = [
    {
      id: 'send-gifts',
      icon: '🎁',
      title: 'Send Gifts',
      description: 'Each time you send a gift, you earn points',
      details: 'Every gift you send through NovaGift earns you progression points. The more you send, the more milestones you unlock!'
    },
    {
      id: 'hit-milestones',
      icon: '🎯',
      title: 'Hit Milestones',
      description: 'Points unlock spend milestones like $50, $100',
      details: 'Your total spending unlocks milestones at $50, $100, $250, and $500. Each milestone gives you credits to spend on skins.'
    },
    {
      id: 'connect-wallet',
      icon: '👛',
      title: 'Connect Wallet',
      description: 'Link a Stellar wallet to track your skins',
      details: 'Connect your Stellar wallet to securely store and manage your skin collection. Your skins are saved on the blockchain.'
    },
    {
      id: 'buy-equip',
      icon: '🎨',
      title: 'Buy & Equip Skins',
      description: 'Use your milestone credits to buy and apply skins',
      details: 'Browse the skin collection, purchase with your earned credits, and customize your NovaGift experience!'
    }
  ];

  const faqs = [
    {
      question: 'What is a milestone?',
      answer: 'Milestones are spending thresholds ($50, $100, $250, $500) that unlock credits you can use to purchase skins.'
    },
    {
      question: 'Do I need crypto to start?',
      answer: 'No! You can start sending gifts immediately. You only need a Stellar wallet if you want to purchase and store skins.'
    },
    {
      question: 'How do I remove a skin?',
      answer: 'Go to the Skin Studio and select "Default" or any other skin you own to change your current appearance.'
    },
    {
      question: 'Is my data safe?',
      answer: 'Yes! We protect your data under Canadian PIPEDA regulations and only store what\'s necessary for the service.'
    }
  ];

  if (!showContent) {
    return (
      <div className="min-h-dvh bg-white dark:bg-neutral-900 flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-200 mb-4">
            Guide Hidden
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            You've chosen to hide the guide. You can always return to it later.
          </p>
          <button
            onClick={() => navigate('/studio')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Studio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white dark:bg-neutral-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-neutral-800 dark:text-neutral-200 mb-2">
            How the Skin Store Works
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 text-lg">
            Follow these quick steps and start customizing your KALE experience.
          </p>
        </header>

        {/* Hide Tips Toggle */}
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 mb-8">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-neutral-700 dark:text-neutral-300">
              Hide tips next time
            </span>
            <input
              type="checkbox"
              checked={hideGuide}
              onChange={(e) => handleHideGuide(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-neutral-100 border-neutral-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-neutral-800 focus:ring-2 dark:bg-neutral-700 dark:border-neutral-600"
              aria-label="Hide guide tips next time I visit"
            />
          </label>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
            This will remember your preference for 90 days. We need functional storage consent to save this setting.
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Steps Section */}
          <section>
            <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-6">
              Getting Started
            </h2>
            <div className="space-y-4">
              {sections.map((section) => (
                <div
                  key={section.id}
                  className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={() => setExpandedSection(
                      expandedSection === section.id ? null : section.id
                    )}
                    className="w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
                    aria-expanded={expandedSection === section.id}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{section.icon}</span>
                      <h3 className="font-semibold text-neutral-800 dark:text-neutral-200">
                        {section.title}
                      </h3>
                    </div>
                    <p className="text-neutral-600 dark:text-neutral-400 text-sm">
                      {section.description}
                    </p>
                  </button>
                  
                  {expandedSection === section.id && (
                    <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                      <p className="text-neutral-700 dark:text-neutral-300 text-sm">
                        {section.details}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* FAQ Section */}
          <section>
            <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {faqs.map((faq, index) => (
                <details
                  key={index}
                  className="border border-neutral-200 dark:border-neutral-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <summary className="cursor-pointer font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded">
                    {faq.question}
                  </summary>
                  <p className="mt-3 text-neutral-600 dark:text-neutral-400 text-sm">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-700">
          <div className="text-center">
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
              We protect your data under Canadian PIPEDA regulations.
            </p>
            <div className="flex justify-center gap-4 text-sm">
              <button
                onClick={() => navigate('/settings')}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Privacy Settings
              </button>
              <button
                onClick={() => navigate('/studio')}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Go to Studio
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
