"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
        {n}
      </span>
      <p className="text-sm text-foreground leading-relaxed pt-0.5">{children}</p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-foreground tracking-wide">
      {children}
    </h3>
  );
}

export default function GuideDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">How to use Cipher</DialogTitle>
          <DialogDescription>
            Real-time trading analysis powered by technical indicators and AI.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Getting Started */}
          <div className="space-y-3">
            <SectionTitle>Getting started</SectionTitle>
            <div className="space-y-2.5">
              <Step n={1}>
                Start the backend server (<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">python3 main.py</code>) and wait for the status indicators to turn green.
              </Step>
              <Step n={2}>
                Type stock symbols into the input bar (e.g. <span className="font-mono text-xs">AAPL, TSLA</span>) and click <strong>ADD</strong> or press Enter.
              </Step>
              <Step n={3}>
                Click <strong>Start</strong> to begin streaming live market data. Cards will appear as data arrives for each symbol.
              </Step>
              <Step n={4}>
                Click <strong>Analyze</strong> on any card to run an AI-powered trade analysis with entry, target, and stop prices.
              </Step>
            </div>
          </div>

          <Separator />

          {/* Understanding the Cards */}
          <div className="space-y-3">
            <SectionTitle>Understanding the cards</SectionTitle>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 shrink-0 rounded-md text-[10px]">Score</Badge>
                <span>The circular gauge (0-10) rates setup quality. <span className="text-green-500">Green (7+)</span> = strong, <span className="text-yellow-500">yellow (5-6)</span> = moderate, <span className="text-red-500">red (&lt;5)</span> = weak.</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 shrink-0 rounded-md text-[10px]">Indicators</Badge>
                <span>VWAP, SMA 8/21, volume ratio, and momentum. <span className="text-green-500">&#9650;</span> means bullish, <span className="text-red-500">&#9660;</span> means bearish for that metric.</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 shrink-0 rounded-md text-[10px]">Patterns</Badge>
                <span>Detected candlestick patterns. <span className="text-green-500">Green</span> = bullish patterns, <span className="text-red-500">red</span> = bearish patterns.</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 shrink-0 rounded-md text-[10px]">Breakdown</Badge>
                <span>Five criteria that make up the score. A checkmark means the condition is met.</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5 shrink-0 rounded-md text-[10px]">AI Analysis</Badge>
                <span>LLM-generated trade recommendation with bias, entry/target/stop levels, and reasoning.</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Using the Data */}
          <div className="space-y-3">
            <SectionTitle>Using the data</SectionTitle>
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc pl-4">
              <li>Look for scores of <strong className="text-foreground">7+</strong> to find the strongest setups.</li>
              <li><strong className="text-foreground">Entry</strong> is the suggested buy price, <strong className="text-green-500">Target</strong> is the profit goal, and <strong className="text-red-500">Stop</strong> is where to cut losses.</li>
              <li>Use the breakdown checklist to quickly see which criteria are passing or failing.</li>
              <li>Volume ratio above <span className="font-mono">1.5x</span> confirms strong participation.</li>
              <li>Data updates in real-time &mdash; cards flash when new data arrives.</li>
            </ul>
          </div>

          <Separator />

          {/* Status Bar */}
          <div className="space-y-3">
            <SectionTitle>Status indicators</SectionTitle>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <p><span className="inline-block h-2 w-2 rounded-full bg-green-500 mr-1.5" /><strong className="text-foreground">Schwab</strong> &mdash; Brokerage API connection.</p>
              <p><span className="inline-block h-2 w-2 rounded-full bg-violet-400 mr-1.5" /><strong className="text-foreground">Ollama</strong> &mdash; Local LLM for AI analysis.</p>
              <p><span className="inline-block h-2 w-2 rounded-full bg-yellow-500 mr-1.5" /><strong className="text-foreground">Engine</strong> &mdash; Data streaming and processing engine.</p>
              <p><span className="inline-block h-2 w-2 rounded-full bg-blue-400 mr-1.5" /><strong className="text-foreground">WS</strong> &mdash; WebSocket connection for live updates.</p>
            </div>
          </div>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
