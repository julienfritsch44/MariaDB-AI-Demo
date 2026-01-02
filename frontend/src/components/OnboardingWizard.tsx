"use client";

import { useState, useEffect } from "react";
import { X, Database, Briefcase, Zap, CheckCircle2, AlertCircle } from "lucide-react";

interface OnboardingWizardProps {
  onComplete: (config: OnboardingConfig) => void;
  onSkip: () => void;
}

interface OnboardingConfig {
  sector: string;
  demoMode: boolean;
  sampleQuery: string;
}

const SECTOR_PRESETS = {
  fintech: {
    name: "FinTech",
    icon: "💰",
    description: "Financial services, banking, payments",
    features: ["Data Masking (RGPD)", "Safe Transaction Mode", "Blast Radius Analysis"],
    sampleQuery: "SELECT * FROM transactions WHERE amount > 10000 AND status = 'pending'",
    color: "emerald"
  },
  ecommerce: {
    name: "E-commerce",
    icon: "🛒",
    description: "Online retail, marketplace, inventory",
    features: ["Plan Stability", "Database Branching", "Query Cost Attribution"],
    sampleQuery: "SELECT * FROM orders WHERE customer_id IN (SELECT id FROM customers WHERE country = 'FR')",
    color: "blue"
  },
  saas: {
    name: "SaaS",
    icon: "☁️",
    description: "Software as a Service, multi-tenant",
    features: ["Schema Drift Detection", "Intelligent Archiving", "Vector Optimizer"],
    sampleQuery: "UPDATE users SET last_login = NOW() WHERE tenant_id = 123",
    color: "purple"
  }
};

export default function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "mock">("checking");
  const [showWizard, setShowWizard] = useState(true);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const response = await fetch("http://localhost:8000/health");
      const data = await response.json();
      
      if (data.database_status === "connected") {
        setConnectionStatus("connected");
      } else {
        setConnectionStatus("mock");
      }
    } catch (error) {
      setConnectionStatus("mock");
    }
  };

  const handleComplete = () => {
    if (!selectedSector) return;
    
    const preset = SECTOR_PRESETS[selectedSector as keyof typeof SECTOR_PRESETS];
    onComplete({
      sector: selectedSector,
      demoMode: connectionStatus === "mock",
      sampleQuery: preset.sampleQuery
    });
    setShowWizard(false);
  };

  const handleSkip = () => {
    onSkip();
    setShowWizard(false);
  };

  if (!showWizard) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Welcome to MariaDB Local Pilot</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Let's configure your DBA workspace in 3 simple steps
            </p>
          </div>
          <button
            onClick={handleSkip}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    s < step
                      ? "bg-primary text-primary-foreground"
                      : s === step
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s < step ? <CheckCircle2 className="w-4 h-4" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 rounded-full transition-all ${
                      s < step ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mb-4">
            <span>Connection</span>
            <span>Sector</span>
            <span>Ready</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px]">
          {/* Step 1: Connection Status */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center">
                <Database className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Database Connection</h3>
                <p className="text-muted-foreground">
                  Checking your MariaDB SkySQL connection...
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                {connectionStatus === "checking" && (
                  <div className="flex items-center justify-center space-x-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
                    <span className="text-sm text-muted-foreground">Connecting to SkySQL...</span>
                  </div>
                )}

                {connectionStatus === "connected" && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-emerald-500">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-semibold">Connected to MariaDB SkySQL</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>✅ Live database access enabled</p>
                      <p>✅ All 16 advanced features available</p>
                      <p>✅ Real-time query analysis</p>
                    </div>
                  </div>
                )}

                {connectionStatus === "mock" && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3 text-amber-500">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-semibold">Demo Mode Active</span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>⚠️ Unable to connect to SkySQL</p>
                      <p>✅ Demo mode with realistic mock data</p>
                      <p>✅ All features available for testing</p>
                      <p className="text-xs mt-2 text-muted-foreground/70">
                        This ensures a perfect demo even without database access
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={connectionStatus === "checking"}
                className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Sector Selection */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center">
                <Briefcase className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">Choose Your Sector</h3>
                <p className="text-muted-foreground">
                  We'll configure features optimized for your industry
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {Object.entries(SECTOR_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedSector(key)}
                    className={`text-left p-5 rounded-lg border-2 transition-all ${
                      selectedSector === key
                        ? `border-${preset.color}-500 bg-${preset.color}-500/10`
                        : "border-border hover:border-primary/50 bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="text-4xl">{preset.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg mb-1">{preset.name}</h4>
                        <p className="text-sm text-muted-foreground mb-3">{preset.description}</p>
                        <div className="flex flex-wrap gap-2">
                          {preset.features.map((feature) => (
                            <span
                              key={feature}
                              className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                      {selectedSector === key && (
                        <CheckCircle2 className={`w-6 h-6 text-${preset.color}-500`} />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-border py-3 rounded-lg font-semibold hover:bg-muted transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!selectedSector}
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Ready to Start */}
          {step === 3 && selectedSector && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="text-center">
                <Zap className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h3 className="text-xl font-semibold mb-2">You're All Set!</h3>
                <p className="text-muted-foreground">
                  Your workspace is configured for {SECTOR_PRESETS[selectedSector as keyof typeof SECTOR_PRESETS].name}
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-6 space-y-4">
                <h4 className="font-semibold">What's Next?</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Try the sample query</p>
                      <p className="text-muted-foreground">
                        We'll analyze a typical {SECTOR_PRESETS[selectedSector as keyof typeof SECTOR_PRESETS].name.toLowerCase()} query
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Explore 16 advanced features</p>
                      <p className="text-muted-foreground">
                        All features are pre-configured for your sector
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">See ROI in action</p>
                      <p className="text-muted-foreground">
                        Track savings and incidents prevented
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-background rounded border border-border">
                  <p className="text-xs text-muted-foreground mb-2">Sample Query:</p>
                  <code className="text-xs font-mono text-foreground">
                    {SECTOR_PRESETS[selectedSector as keyof typeof SECTOR_PRESETS].sampleQuery}
                  </code>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 border border-border py-3 rounded-lg font-semibold hover:bg-muted transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  Start Analyzing
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 bg-muted/30">
          <p className="text-xs text-center text-muted-foreground">
            You can always change these settings later in the configuration panel
          </p>
        </div>
      </div>
    </div>
  );
}
