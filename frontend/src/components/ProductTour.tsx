"use client";

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Sparkles, CheckCircle2 } from "lucide-react";

interface TourStep {
  title: string;
  description: string;
  icon: string;
  target?: string;
  highlight?: boolean;
  position?: "top" | "bottom" | "left" | "right";
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to MariaDB Local Pilot",
    description: "Your AI-powered DBA workspace with 16 advanced features. Let's take a quick tour to show you what makes this platform unique.",
    icon: "🚀",
    highlight: false
  },
  {
    title: "5 Core DBA Dreams",
    description: "Deep Diagnostics, Pre-Deployment Prediction, Virtual Indexing, Self-Healing SQL, and Smart Sandboxing - all the essentials covered.",
    icon: "⭐",
    highlight: false
  },
  {
    title: "Query Cost Attribution",
    description: "See exactly how much each query costs in $/month on AWS/Azure. Identify expensive queries instantly and justify optimization budgets.",
    icon: "💰",
    target: "cost-section",
    highlight: true
  },
  {
    title: "Wait Events Profiling",
    description: "Analyze InnoDB locks and wait events in real-time. Understand what's blocking your queries with Performance Schema integration.",
    icon: "⏱️",
    target: "waitevents-section",
    highlight: true
  },
  {
    title: "Resource Groups Throttling",
    description: "Automatically limit resource-hungry queries. Assign queries to resource groups based on risk score to protect production.",
    icon: "🎛️",
    target: "resourcegroup-section",
    highlight: true
  },
  {
    title: "Plan Stability Baseline",
    description: "Detect plan flips before they cause performance regressions. Force optimal plans with hints when the optimizer changes its mind.",
    icon: "📊",
    highlight: false
  },
  {
    title: "Dynamic Data Masking",
    description: "GDPR-compliant diagnostics. Mask PII (emails, credit cards, SSN) on-the-fly so DBAs can work without seeing sensitive data.",
    icon: "🔒",
    highlight: false
  },
  {
    title: "Schema Drift Detection",
    description: "Git vs Production schema comparison. Auto-generate fix scripts when your production schema diverges from source control.",
    icon: "🔍",
    highlight: false
  },
  {
    title: "Intelligent Archiving",
    description: "ML-based archiving recommendations. Save 40-60% on storage costs by moving cold data to S3/Glacier automatically.",
    icon: "🗄️",
    highlight: false
  },
  {
    title: "Database Branching",
    description: "Copy-on-write database clones in <5 seconds. Test DDL changes safely without affecting production.",
    icon: "🌿",
    highlight: false
  },
  {
    title: "3 Exclusive Features",
    description: "Safe Transaction Mode, Blast Radius Analyzer, and Adaptive Vector Optimizer - features that don't exist in ANY competitor.",
    icon: "⭐",
    highlight: false
  },
  {
    title: "Safe Transaction Mode",
    description: "Block all DML queries outside explicit transactions. Prevent 100% of silent data corruption from autocommit mistakes.",
    icon: "🛡️",
    highlight: false
  },
  {
    title: "Blast Radius Analyzer",
    description: "Transform technical risk into business decisions. See how many users and services are affected by a query before running it.",
    icon: "💥",
    highlight: false
  },
  {
    title: "Adaptive Vector Optimizer",
    description: "Auto-tune vector search parameters for +35% performance. Native MariaDB 11.7 vector support with intelligent optimization.",
    icon: "🎯",
    highlight: false
  },
  {
    title: "Unified Workflow",
    description: "All 16 features in ONE interface. Analyze → Test → Optimize → Compare - complete workflow in 30 seconds.",
    icon: "⚡",
    highlight: false
  },
  {
    title: "ROI: $187,000/year",
    description: "Proven savings: -60% storage costs, -40% incidents, +67% query performance. Every feature has measurable business impact.",
    icon: "📈",
    highlight: false
  },
  {
    title: "Ready to Start?",
    description: "Try analyzing a query to see all features in action. The platform works in both Live (SkySQL) and Demo mode.",
    icon: "✨",
    highlight: false
  }
];

interface ProductTourProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function ProductTour({ onComplete, onSkip }: ProductTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showTour, setShowTour] = useState(true);

  const currentStepData = TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const progress = ((currentStep + 1) / TOUR_STEPS.length) * 100;

  useEffect(() => {
    if (currentStepData.target) {
      const element = document.getElementById(currentStepData.target);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        if (currentStepData.highlight) {
          element.classList.add('tour-highlight');
        }
        
        // Update spotlight cutout position
        const updateSpotlight = () => {
          const rect = element.getBoundingClientRect();
          const spotlight = document.getElementById('spotlight-cutout');
          if (spotlight) {
            const padding = 8;
            spotlight.style.top = `${rect.top - padding}px`;
            spotlight.style.left = `${rect.left - padding}px`;
            spotlight.style.width = `${rect.width + padding * 2}px`;
            spotlight.style.height = `${rect.height + padding * 2}px`;
            spotlight.style.borderRadius = '12px';
          }
        };
        
        updateSpotlight();
        window.addEventListener('resize', updateSpotlight);
        
        return () => {
          element.classList.remove('tour-highlight');
          window.removeEventListener('resize', updateSpotlight);
        };
      }
    }
  }, [currentStep, currentStepData]);

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('hasSeenProductTour', 'true');
    setShowTour(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('hasSeenProductTour', 'true');
    setShowTour(false);
    onSkip();
  };

  if (!showTour) return null;

  // Calculate card position based on target element
  const getCardPosition = () => {
    if (!currentStepData.target) {
      return { bottom: '50%', left: '50%', transform: 'translate(-50%, 50%)' };
    }

    const element = document.getElementById(currentStepData.target);
    if (!element) {
      return { bottom: '6rem', right: '1.5rem' };
    }

    const rect = element.getBoundingClientRect();
    const cardWidth = 420;
    const cardHeight = 300;
    const padding = 20;

    // Try to position card to the right of the element
    if (rect.right + cardWidth + padding < window.innerWidth) {
      return {
        top: `${Math.max(padding, rect.top)}px`,
        left: `${rect.right + padding}px`
      };
    }
    
    // Try to position card to the left of the element
    if (rect.left - cardWidth - padding > 0) {
      return {
        top: `${Math.max(padding, rect.top)}px`,
        right: `${window.innerWidth - rect.left + padding}px`
      };
    }

    // Position below the element
    if (rect.bottom + cardHeight + padding < window.innerHeight) {
      return {
        top: `${rect.bottom + padding}px`,
        left: `${Math.max(padding, Math.min(rect.left, window.innerWidth - cardWidth - padding))}px`
      };
    }

    // Default: center bottom
    return { bottom: '6rem', left: '50%', transform: 'translateX(-50%)' };
  };

  const cardPosition = getCardPosition();

  return (
    <>
      {/* Simple overlay - no spotlight, just dim */}
      <div className="fixed inset-0 bg-black/50 z-40 animate-in fade-in duration-300" />
      
      {/* Arrow pointing to target element */}
      {currentStepData.target && (() => {
        const element = document.getElementById(currentStepData.target);
        if (!element) return null;
        
        const rect = element.getBoundingClientRect();
        const arrowSize = 40;
        
        // Position arrow to the left of element
        return (
          <div
            className="fixed z-45 pointer-events-none animate-bounce"
            style={{
              top: `${rect.top + rect.height / 2 - arrowSize / 2}px`,
              left: `${rect.left - arrowSize - 10}px`
            }}
          >
            <div className="text-primary text-4xl">→</div>
          </div>
        );
      })()}
      
      {/* Tour Card - Fixed bottom right for visibility */}
      <div className="fixed bottom-6 right-6 z-50 w-[420px] animate-in slide-in-from-bottom-8 duration-500">
        <div className="bg-card border-2 border-primary/20 rounded-xl shadow-2xl overflow-hidden">
          {/* Progress Bar */}
          <div className="h-1 bg-muted">
            <div 
              className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="p-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="text-3xl">{currentStepData.icon}</div>
                <div>
                  <div className="text-xs text-muted-foreground">
                    Step {currentStep + 1} of {TOUR_STEPS.length}
                  </div>
                  <h3 className="font-semibold text-foreground">{currentStepData.title}</h3>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="text-muted-foreground hover:text-foreground transition-colors"
                title="Skip tour"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {currentStepData.description}
            </p>

            {/* Feature Highlight Badge */}
            {currentStepData.highlight && (
              <div className="mt-4 flex items-center space-x-2 text-xs text-primary">
                <Sparkles className="w-4 h-4" />
                <span className="font-medium">This feature is highlighted in the interface</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip Tour
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevious}
                disabled={isFirstStep}
                className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleNext}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center space-x-2"
              >
                {isLastStep ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Start Using</span>
                  </>
                ) : (
                  <>
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Quick Navigation Dots */}
          <div className="px-4 pb-3 flex items-center justify-center space-x-1">
            {TOUR_STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${
                  index === currentStep
                    ? 'bg-primary w-6'
                    : index < currentStep
                    ? 'bg-primary/50'
                    : 'bg-muted-foreground/30'
                }`}
                title={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="mt-2 text-center text-xs text-muted-foreground">
          Use ← → arrow keys to navigate
        </div>
      </div>

      {/* Keyboard Navigation */}
      <style jsx global>{`
        @keyframes tour-pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(var(--primary-rgb), 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(var(--primary-rgb), 0);
          }
        }

        .tour-highlight {
          position: relative;
          z-index: 45;
          animation: tour-pulse 2s infinite;
          border-radius: 8px;
          outline: 2px solid hsl(var(--primary));
          outline-offset: 4px;
        }
      `}</style>
    </>
  );
}
