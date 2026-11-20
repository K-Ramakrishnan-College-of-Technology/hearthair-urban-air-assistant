import assert from 'node:assert/strict';
import test from 'node:test';
import type { User } from 'firebase/auth';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CommunityImpactLab } from '../src/components/CommunityImpactLab.tsx';
import { ErrorBoundary } from '../src/components/ErrorBoundary.tsx';
import { HeroConfigurator } from '../src/components/HeroConfigurator.tsx';
import { ImpactLedger } from '../src/components/ImpactLedger.tsx';
import { IndoorHacksAndAdvisor } from '../src/components/IndoorHacksAndAdvisor.tsx';
import { ResilientImage } from '../src/components/ResilientImage.tsx';
import { RoutineAndAlternatives } from '../src/components/RoutineAndAlternatives.tsx';
import { TopBar } from '../src/components/TopBar.tsx';
import { VentilationTimeline } from '../src/components/VentilationTimeline.tsx';
import { DEFAULT_PROFILE, STARTER_PLAN } from '../src/data/defaultPlan.ts';

function setupDom() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost:3000',
  });
  const win = dom.window;

  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  (globalThis as unknown as { window: unknown }).window = win;
  (globalThis as unknown as { document: unknown }).document = win.document;
  (globalThis as unknown as { HTMLElement: unknown }).HTMLElement = win.HTMLElement;
  (globalThis as unknown as { Event: unknown }).Event = win.Event;
  (globalThis as unknown as { Node: unknown }).Node = win.Node;
  Object.defineProperty(globalThis, 'navigator', {
    value: win.navigator,
    configurable: true,
  });

  const container = win.document.getElementById('root')!;
  const root: Root = createRoot(container);

  return {
    dom,
    container,
    render: (element: React.ReactNode) => {
      act(() => {
        root.render(element);
      });
    },
    cleanup: () => {
      act(() => {
        root.unmount();
      });
      dom.window.close();
    },
  };
}

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll('button'));
  const match = buttons.find((b) => (b.textContent ?? '').includes(text));
  assert.ok(match, `Expected button containing "${text}"`);
  return match;
}

test('TopBar renders signed-out and signed-in actions and invokes callbacks', () => {
  const env = setupDom();
  let signInCalls = 0;
  let signOutCalls = 0;

  try {
    env.render(
      React.createElement(TopBar, {
        user: null,
        authBusy: false,
        onSignIn: () => {
          signInCalls += 1;
        },
        onSignOut: () => {
          signOutCalls += 1;
        },
      })
    );

    const signInBtn = findButtonByText(env.container, 'Sign in with Google');
    act(() => {
      signInBtn.click();
    });
    assert.equal(signInCalls, 1);

    env.render(
      React.createElement(TopBar, {
        user: { uid: 'u1', displayName: 'Asha Patel' } as User,
        authBusy: false,
        onSignIn: () => {},
        onSignOut: () => {
          signOutCalls += 1;
        },
      })
    );

    const signOutBtn = findButtonByText(env.container, 'Sign out (Asha)');
    act(() => {
      signOutBtn.click();
    });
    assert.equal(signOutCalls, 1);
  } finally {
    env.cleanup();
  }
});

test('HeroConfigurator submits tailored plan, displays local brief sources, and renders alert errors', () => {
  const env = setupDom();
  let generateCount = 0;
  let briefCount = 0;

  try {
    env.render(
      React.createElement(HeroConfigurator, {
        profile: DEFAULT_PROFILE,
        plan: STARTER_PLAN,
        isDefaultStarter: true,
        generatingPlan: false,
        fetchingBrief: false,
        localBrief: {
          city: 'Salt Lake City, UT',
          advisoryHeadline: 'Winter Smog Brief',
          briefText: 'Mid-afternoon clearing expected.',
          groundingSources: [{ title: 'Utah DEQ', uri: 'https://deq.utah.gov' }],
        },
        completedCountToday: 2,
        aiError: 'Temporary AI outage',
        onChangeProfile: () => {},
        onGeneratePlan: () => {
          generateCount += 1;
        },
        onFetchLocalBrief: () => {
          briefCount += 1;
        },
      })
    );

    const alert = env.container.querySelector('[role="alert"]');
    assert.ok(alert?.textContent?.includes('Temporary AI outage'));
    assert.ok(env.container.textContent?.includes('Utah DEQ'));

    const form = env.container.querySelector('form')!;
    act(() => {
      form.dispatchEvent(new env.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    });
    assert.equal(generateCount, 1);

    const briefBtn = findButtonByText(env.container, 'Check Local Smog Brief');
    act(() => {
      briefBtn.click();
    });
    assert.equal(briefCount, 1);
  } finally {
    env.cleanup();
  }
});

test('RoutineAndAlternatives filters windows with aria-pressed and logs actions and swaps', () => {
  const env = setupDom();
  const logged: string[] = [];

  try {
    env.render(
      React.createElement(RoutineAndAlternatives, {
        plan: STARTER_PLAN,
        loggedTitlesToday: new Set<string>(),
        savingActionKey: null,
        onLogAction: (entry) => {
          logged.push(entry.actionTitle);
        },
      })
    );

    const morningBtn = findButtonByText(env.container, 'Morning');
    act(() => {
      morningBtn.click();
    });
    assert.equal(morningBtn.getAttribute('aria-pressed'), 'true');

    const logBtn = findButtonByText(env.container, 'Log Action Today');
    act(() => {
      logBtn.click();
    });
    const swapBtn = findButtonByText(env.container, 'Commit Swap');
    act(() => {
      swapBtn.click();
    });

    assert.equal(logged.length, 2);
  } finally {
    env.cleanup();
  }
});

test('IndoorHacksAndAdvisor filters cost tiers, populates quick questions, and submits advisor query', () => {
  const env = setupDom();
  let latestQuestionDraft = '';
  let askedQuestion = '';

  try {
    env.render(
      React.createElement(IndoorHacksAndAdvisor, {
        profile: DEFAULT_PROFILE,
        plan: STARTER_PLAN,
        loggedTitlesToday: new Set<string>(),
        savingActionKey: null,
        askingAdvisor: false,
        advisorError: null,
        latestAnswer: {
          question: 'Should we run bath fan?',
          answer: 'Use spot ventilation only briefly.',
          impactTakeaway: 'Avoids negative pressure.',
          actionableChecklist: ['Check outdoor AQI'],
        },
        questionInput: 'How to seal door gaps?',
        onChangeQuestionInput: (q) => {
          latestQuestionDraft = q;
        },
        onAskAdvisor: (q) => {
          askedQuestion = q;
        },
        onLogAction: () => {},
      })
    );

    const freeBtn = findButtonByText(env.container, 'Free');
    act(() => {
      freeBtn.click();
    });
    assert.equal(freeBtn.getAttribute('aria-pressed'), 'true');
    assert.ok(env.container.textContent?.includes('Back-Burner'));

    const quickBtn = findButtonByText(env.container, 'Is it safe to crack bedroom windows');
    act(() => {
      quickBtn.click();
    });
    assert.ok(latestQuestionDraft.includes('crack bedroom windows'));

    const form = env.container.querySelector('form')!;
    act(() => {
      form.dispatchEvent(new env.dom.window.Event('submit', { bubbles: true, cancelable: true }));
    });
    assert.equal(askedQuestion, 'How to seal door gaps?');
    assert.ok(env.container.textContent?.includes('Check outdoor AQI'));
  } finally {
    env.cleanup();
  }
});

test('CommunityImpactLab triggers simulation commit, community notice generation, and clipboard copy', async () => {
  const env = setupDom();
  let committedTitle = '';
  let briefParamsCount = 0;
  const announcements: string[] = [];

  Object.defineProperty(globalThis.navigator, 'clipboard', {
    value: {
      writeText: async () => {},
    },
    configurable: true,
  });

  try {
    env.render(
      React.createElement(CommunityImpactLab, {
        profile: DEFAULT_PROFILE,
        plan: STARTER_PLAN,
        generatingBrief: false,
        communityBrief: {
          city: 'Salt Lake City, UT',
          title: 'Block Smog Action Notice',
          bulletinText: 'Avoid morning cold-start idling.',
          actionBullets: ['Carpool 2 days/week'],
          collectiveImpactSummary: 'Saves 500 kg CO2e.',
        },
        briefError: null,
        onGenerateCommunityBrief: () => {
          briefParamsCount += 1;
        },
        onCommitSimulation: (entry) => {
          committedTitle = entry.actionTitle;
        },
        onAnnounce: (msg) => {
          announcements.push(msg);
        },
      })
    );

    const commitBtn = findButtonByText(env.container, 'Log Simulated Plan Today');
    act(() => {
      commitBtn.click();
    });
    assert.ok(committedTitle.startsWith('Winter Shield:'));

    const genBtn = findButtonByText(env.container, 'Generate Community Notice');
    act(() => {
      genBtn.click();
    });
    assert.equal(briefParamsCount, 1);

    const copyBtn = findButtonByText(env.container, 'Copy Notice');
    await act(async () => {
      copyBtn.click();
      await Promise.resolve();
    });
    assert.ok(announcements.some((a) => a.includes('copied')));
  } finally {
    env.cleanup();
  }
});

test('ImpactLedger calculates completed CO2e, toggles/deletes logs, and handles Retry Save', () => {
  const env = setupDom();
  let retried = 0;
  let toggled = '';
  let deleted = '';

  try {
    env.render(
      React.createElement(ImpactLedger, {
        user: { uid: 'u1', displayName: 'Sam' } as User,
        impactLogs: [
          {
            id: 'log-1',
            ownerId: 'u1',
            dateKey: '2025-02-05',
            actionTitle: 'Run HEPA on medium',
            category: 'indoor_hack',
            co2SavedGrams: 1500,
            pm25ExposureAvoidedPct: 35,
            completed: true,
          },
        ],
        savedPlans: [
          {
            ...STARTER_PLAN,
            id: 'plan-1',
            ownerId: 'u1',
          },
        ],
        savedInteractions: [
          {
            id: 'int-1',
            ownerId: 'u1',
            city: 'Salt Lake City, UT',
            question: 'Ventilation timing?',
            answer: '2 PM is best.',
            impactTakeaway: 'Reduces CO2.',
          },
        ],
        persistError: 'Network interrupted',
        hasPendingRetry: true,
        retryingSave: false,
        onRetrySave: () => {
          retried += 1;
        },
        onDismissError: () => {},
        onSignIn: () => {},
        onToggleLog: (id) => {
          toggled = id;
        },
        onDeleteLog: (id) => {
          deleted = id;
        },
        onLoadPlan: () => {},
        onDeletePlan: () => {},
        onDeleteInteraction: () => {},
      })
    );

    assert.ok(env.container.textContent?.includes('1 completed · 1.50 kg CO2e saved'));

    const retryBtn = findButtonByText(env.container, 'Retry Save');
    act(() => {
      retryBtn.click();
    });
    assert.equal(retried, 1);

    const toggleBtn = findButtonByText(env.container, 'Run HEPA on medium');
    act(() => {
      toggleBtn.click();
    });
    assert.equal(toggled, 'log-1');

    const delBtn = env.container.querySelector('button[aria-label="Remove Run HEPA on medium"]') as HTMLButtonElement;
    act(() => {
      delBtn.click();
    });
    assert.equal(deleted, 'log-1');
  } finally {
    env.cleanup();
  }
});

test('ErrorBoundary recovers from render errors and ResilientImage displays fallback label on error', () => {
  const env = setupDom();
  const originalError = console.error;
  console.error = () => {};

  let shouldThrow = true;
  function FlakyChild() {
    if (shouldThrow) {
      throw new Error('Synthetic UI crash');
    }
    return React.createElement('div', null, 'Recovered content');
  }

  try {
    env.render(
      React.createElement(
        ErrorBoundary,
        null,
        React.createElement(FlakyChild)
      )
    );
    assert.ok(env.container.textContent?.includes('Application recovery needed'));
    assert.ok(env.container.textContent?.includes('Synthetic UI crash'));

    shouldThrow = false;
    const restoreBtn = findButtonByText(env.container, 'Restore Workspace');
    act(() => {
      restoreBtn.click();
    });
    assert.ok(env.container.textContent?.includes('Recovered content'));

    env.render(
      React.createElement(ResilientImage, {
        src: '/missing.jpg',
        alt: 'Winter air purifier',
        fallbackLabel: 'Protected Indoor Air',
      })
    );
    const img = env.container.querySelector('img')!;
    act(() => {
      img.dispatchEvent(new env.dom.window.Event('error'));
    });
    assert.ok(env.container.textContent?.includes('Protected Indoor Air'));
  } finally {
    console.error = originalError;
    env.cleanup();
  }
});

test('VentilationTimeline defaults to lowest-AQI slot and switches guidance on slot click', () => {
  const env = setupDom();

  try {
    env.render(
      React.createElement(VentilationTimeline, {
        profile: { ...DEFAULT_PROFILE, aqiLevel: 135 },
      })
    );

    const afternoonBtn = findButtonByText(env.container, '15:00');
    assert.equal(afternoonBtn.getAttribute('aria-pressed'), 'true');
    assert.ok(env.container.textContent?.includes('Safe 10-Min Purge'));

    const morningBtn = findButtonByText(env.container, '06:00');
    act(() => {
      morningBtn.click();
    });
    assert.equal(morningBtn.getAttribute('aria-pressed'), 'true');
    assert.ok(env.container.textContent?.includes('Keep Sealed + HEPA'));
  } finally {
    env.cleanup();
  }
});

