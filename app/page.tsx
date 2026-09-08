'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { LogoAnimation } from '@/components/app/LogoAnimation'
import { EarlyAccessModal } from '@/components/app/EarlyAccessModal'
import { BRAND } from '@/lib/brand'
import './splash.css'

export default function SplashPage() {
  const navRef = useRef<HTMLElement>(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return

    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 20)
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    const revealEls = document.querySelectorAll('.scroll-reveal, .stagger-reveal')
    let observer: IntersectionObserver | undefined
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible')
              observer!.unobserve(entry.target)
            }
          })
        },
        { threshold: 0, rootMargin: '0px 0px -10% 0px' }
      )
      revealEls.forEach((el) => observer!.observe(el))
    } else {
      revealEls.forEach((el) => el.classList.add('visible'))
    }

    const timer = setTimeout(() => {
      document
        .querySelectorAll('.scroll-reveal:not(.visible), .stagger-reveal:not(.visible)')
        .forEach((el) => {
          if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('visible')
        })
    }, 1500)

    return () => {
      window.removeEventListener('scroll', onScroll)
      observer?.disconnect()
      clearTimeout(timer)
    }
  }, [])

  return (
    <div className="splash-page">
      {/**/}
      <nav className="nav" id="nav" ref={navRef}>
        <div className="nav-inner">
          <a href="#" className="nav-logo">
            <Image src="/images/logo/lockup_dark.svg" alt={BRAND.name} width={160} height={58} priority unoptimized style={{ width: 160, height: 'auto' }} />
            <span className="badge">Preview</span>
          </a>
          <div className="nav-links">
            <a href="#story">Story</a>
            <a href="#product">Product</a>
            {/* Stays visible on mobile, unlike the other nav links — testers
                arriving on a phone need a way in. */}
            <Link href="/login" className="nav-signin">Log in</Link>
            <a href="#request" className="nav-cta" onClick={(e) => { e.preventDefault(); setModalOpen(true) }}>Request early access</a>
          </div>
        </div>
      </nav>
      
      {/**/}
      <section className="hero">
        <div className="hero-bg">
          <div className="hero-grid"></div>
        </div>
      
        <div className="container hero-content">
          <div className="hero-eyebrow reveal delay-1">{BRAND.eyebrow}</div>

          {/* Animated brand lockup — logo + wordmark */}
          <div className="hero-brand reveal delay-2" aria-label={BRAND.name}>
            <div className="hero-brand-logo">
              <LogoAnimation size={140} />
            </div>
            <span className="hero-brand-wordmark-wrap">
              <span className="hero-brand-wordmark">
                {BRAND.wordmark.stem}<span className="hero-brand-iq">{BRAND.wordmark.accent}</span>
              </span>
              <span className="hero-brand-wfg" aria-label="Built by WFG — Williston Financial Group">
                <span className="hero-brand-wfg-label">Built by</span>
                <Image
                  className="wfg-logo for-dark"
                  src="/images/logo/wfg_dark.png"
                  alt="WFG — Williston Financial Group"
                  width={654}
                  height={529}
                  unoptimized
                  style={{ height: 26, width: 'auto' }}
                />
                <Image
                  className="wfg-logo for-light"
                  src="/images/logo/wfg_light.png"
                  alt="WFG — Williston Financial Group"
                  width={654}
                  height={529}
                  unoptimized
                  style={{ height: 26, width: 'auto' }}
                />
              </span>
            </span>
          </div>
          <p className="lead reveal delay-3">The title industry has never really been about transactions. It has always been about people, and the relationships that built your book of business. {BRAND.name} is how you protect it.</p>
          <div className="hero-cta-group reveal delay-4">
            <a href="#request" className="btn btn-primary" onClick={(e) => { e.preventDefault(); setModalOpen(true) }}>Request early access →</a>
            <a href="#product" className="btn btn-secondary">See how it works</a>
          </div>
          <div className="hero-trust reveal delay-5">{BRAND.category}</div>
          <div className="hero-chips reveal delay-5">
            <span className="hero-chip">Built for the field, not the file</span>
            <span className="hero-chip">Your book, scored</span>
            <span className="hero-chip">Effort that connects to revenue</span>
          </div>
        </div>
      
        {/**/}
        <div className="hero-preview reveal delay-5">
          <div className="preview-frame">
            <div className="preview-toolbar">
              <div className="preview-dots">
                <span className="dot-close"></span>
                <span className="dot-min"></span>
                <span className="dot-max"></span>
              </div>
            </div>
            <div className="preview-content">
              <div className="preview-app-header">
                <div className="preview-app-title">
                  <div className="preview-title">Dashboard</div>
                  <div className="preview-subtitle">Good morning, Sarah. Here&apos;s your activity summary.</div>
                </div>
                <div className="preview-cta-group">
                  <div className="preview-cta-fake">+ Add Contract</div>
                  <div className="preview-cta-fake">+ Log Activity</div>
                </div>
              </div>
      
              <div className="preview-ai-card">
                <div className="preview-ai-label">✦ AI · Daily Nudge</div>
                <div className="preview-ai-text">Derek Okafor hasn&apos;t been contacted in 18 days. His score is dropping. A pop-by today would help.</div>
              </div>
      
              <div className="preview-kpis">
                <div className="preview-kpi">
                  <div className="preview-kpi-label">Activities This Week</div>
                  <div className="preview-kpi-value">12</div>
                  <div className="preview-kpi-delta">↑ 3 from last week</div>
                </div>
                <div className="preview-kpi">
                  <div className="preview-kpi-label">Total Spend MTD</div>
                  <div className="preview-kpi-value">$1,240</div>
                  <div className="preview-kpi-delta muted">$800 avg · On track</div>
                </div>
                <div className="preview-kpi">
                  <div className="preview-kpi-label">Contacts Engaged</div>
                  <div className="preview-kpi-value">28</div>
                  <div className="preview-kpi-delta muted">This month</div>
                </div>
                <div className="preview-kpi">
                  <div className="preview-kpi-label">Follow-ups Pending</div>
                  <div className="preview-kpi-value">5</div>
                  <div className="preview-kpi-delta warn">2 overdue</div>
                </div>
                <div className="preview-kpi">
                  <div className="preview-kpi-label">Closed This Month</div>
                  <div className="preview-kpi-value">2</div>
                  <div className="preview-kpi-delta">Contracts closed MTD</div>
                </div>
                <div className="preview-kpi">
                  <div className="preview-kpi-label">Pipeline Value</div>
                  <div className="preview-kpi-value">$55k</div>
                  <div className="preview-kpi-delta muted">Non-closed contracts</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/**/}
      <section id="product" className="section-tight-top-spotlight-first">
        <div className="container">
          <div className="feature-spotlight">
            <div className="spotlight-text scroll-reveal">
              <div className="spotlight-eyebrow">AI-Assisted Logging</div>
              <h3>Log a pop-by in <span className="accent">under thirty seconds.</span></h3>
              <p>One tap to open. One tap to choose the type. Voice it in or type it. The follow-up sets itself. Built mobile-first because your office isn&apos;t an office.</p>
            </div>
            <div className="scroll-reveal">
              <div className="mockup">
                <div className="mockup-bar">
                  <span className="dc"></span><span className="dm"></span><span className="dx"></span>
                </div>
                <div className="mockup-body" style={{ padding: '0' }}>
                  <div className="mock-log-header">
                    <div>
                      <h4>Log Activity</h4>
                      <p>Fill in the details for your activity</p>
                    </div>
                    <button type="button" className="mock-close" aria-label="Close">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
                    </button>
                  </div>
                  <div className="mock-log-body">
                    <div className="mock-mic-wrap">
                      <div className="mock-mic">
                        <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="3" width="6" height="11" rx="3" />
                          <path d="M5 11a7 7 0 0 0 14 0" />
                          <line x1="12" y1="18" x2="12" y2="22" />
                        </svg>
                      </div>
                      <div className="mock-mic-label">Tap to voice log</div>
                      <div className="mock-mic-sub">Describe your activity and AI will fill in the fields</div>
                    </div>
      
                    <div className="mock-field-label">Activity Type</div>
                    <div className="mock-type-grid mock-type-grid-4">
                      <div className="mock-type-tile active">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3v8a3 3 0 0 0 3 3v7" /><path d="M8 3v6" /><path d="M16 3c-1.5 1.5-2 3-2 5 0 1.5.5 2.5 1.5 3l-.5 10" /></svg>
                        <span>Lunch</span>
                      </div>
                      <div className="mock-type-tile">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11V6a1.5 1.5 0 1 1 3 0v4" /><path d="M12 10V4.5a1.5 1.5 0 1 1 3 0V11" /><path d="M15 11V6.5a1.5 1.5 0 1 1 3 0V14a7 7 0 0 1-14 0v-3a1.5 1.5 0 1 1 3 0v2" /></svg>
                        <span>Pop-by</span>
                      </div>
                      <div className="mock-type-tile">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5" /></svg>
                        <span>CE Class</span>
                      </div>
                      <div className="mock-type-tile">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h14v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z" /><path d="M17 10h2a2 2 0 0 1 0 4h-2" /><path d="M7 4v2M10 3v3M13 4v2" /></svg>
                        <span>Coffee</span>
                      </div>
                    </div>
                    <div className="mock-type-grid mock-type-grid-3">
                      <div className="mock-type-tile">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="8" width="18" height="13" rx="1" /><path d="M3 12h18" /><path d="M12 8v13" /><path d="M7.5 8a2.5 2.5 0 0 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 0 1 0 5" /></svg>
                        <span>Closing Gift</span>
                      </div>
                      <div className="mock-type-tile">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                        <span>Call</span>
                      </div>
                      <div className="mock-type-tile">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        <span>Other</span>
                      </div>
                    </div>
      
                    <div className="mock-field-label">Activity Name <span className="opt">(optional)</span></div>
                    <div className="mock-input">e.g. Lunch with Mike re: Q2 pipeline</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/**/}
      <section className="spotlight-stack">
        <div className="container">
          <div className="feature-spotlight reverse">
            <div className="scroll-reveal">
              <div className="mockup">
                <div className="mockup-bar">
                  <span className="dc"></span><span className="dm"></span><span className="dx"></span>
                </div>
                <div className="mockup-body">
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px', marginBottom: '18px', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '-0.01em' }}>Relationship Scores</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}><span style={{ color: 'var(--gold)', fontWeight: '600' }}>AVG 80</span> · Top score <span style={{ color: 'var(--gold)', fontWeight: '600' }}>92 · Marcus Webb</span></div>
                  </div>
                  <div className="mock-scores">
                    <div className="mock-score-row">
                      <div className="mock-score-rank">1</div>
                      <div className="mock-score-name">
                        <div className="mock-lb-avatar">MW</div>
                        <div><div className="nm">Marcus Webb</div><div className="sub">Senior Broker</div></div>
                      </div>
                      <div className="mock-score-ring">92</div>
                      <div className="mock-score-bars">
                        <div className="mock-score-bar">Recency<span className="b"></span></div>
                        <div className="mock-score-bar">Frequency<span className="b"></span></div>
                        <div className="mock-score-bar">Diversity<span className="b amber"></span></div>
                        <div className="mock-score-bar">Engagement<span className="b"></span></div>
                      </div>
                    </div>
                    <div className="mock-score-row">
                      <div className="mock-score-rank">2</div>
                      <div className="mock-score-name">
                        <div className="mock-lb-avatar">BM</div>
                        <div><div className="nm">Brendan Mills</div><div className="sub">Team Lead</div></div>
                      </div>
                      <div className="mock-score-ring">88</div>
                      <div className="mock-score-bars">
                        <div className="mock-score-bar">Recency<span className="b"></span></div>
                        <div className="mock-score-bar">Frequency<span className="b"></span></div>
                        <div className="mock-score-bar">Diversity<span className="b"></span></div>
                        <div className="mock-score-bar">Engagement<span className="b"></span></div>
                      </div>
                    </div>
                    <div className="mock-score-row">
                      <div className="mock-score-rank">3</div>
                      <div className="mock-score-name">
                        <div className="mock-lb-avatar">DO</div>
                        <div><div className="nm">Derek Okafor</div><div className="sub">Owner / Broker</div></div>
                      </div>
                      <div className="mock-score-ring amber">65</div>
                      <div className="mock-score-bars">
                        <div className="mock-score-bar">Recency<span className="b amber"></span></div>
                        <div className="mock-score-bar">Frequency<span className="b amber"></span></div>
                        <div className="mock-score-bar">Diversity<span className="b dim"></span></div>
                        <div className="mock-score-bar">Engagement<span className="b amber"></span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="spotlight-text scroll-reveal">
              <div className="spotlight-eyebrow">Relationship Scoring</div>
              <h3>Every contact, scored <span className="accent">zero to one hundred.</span></h3>
              <p>Recency. Frequency. Diversity. Engagement. Four signals, one score, per contact. Know who&apos;s slipping before they do. Know exactly which dimension to fix.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/**/}
      <section className="spotlight-stack">
        <div className="container">
          <div className="feature-spotlight">
            <div className="spotlight-text scroll-reveal">
              <div className="spotlight-eyebrow">The Manager&apos;s View</div>
              <h3>The full team. <span className="accent">In a single glance.</span></h3>
              <p>Leaderboards, heatmaps, MTD/QTD/YTD toggles, and per-rep deep dives. See where the team&apos;s collective effort is actually landing.</p>
            </div>
            <div className="scroll-reveal">
              <div className="mockup">
                <div className="mockup-bar">
                  <span className="dc"></span><span className="dm"></span><span className="dx"></span>
                </div>
                <div className="mockup-body" style={{ background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '700', letterSpacing: '-0.01em' }}>Team Leaderboard</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>Top 8 reps · MTD</div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--gold)', border: '1px solid var(--gold)', padding: '3px 10px', borderRadius: '999px', letterSpacing: '0.06em' }}>MTD</div>
                  </div>
                  <div className="mock-leaderboard">
                    <div className="mock-lb-head">
                      <div>#</div>
                      <div>Rep</div>
                      <div>Activities</div>
                      <div className="col-spend">Spend</div>
                      <div>Status</div>
                    </div>
                    <div className="mock-lb-row">
                      <div className="mock-lb-rank lead">1</div>
                      <div className="mock-lb-rep"><div className="mock-lb-avatar">SC</div>Sarah Chen</div>
                      <div className="mock-lb-num">21</div>
                      <div className="mock-lb-num plain col-spend">$1,240</div>
                      <div><span className="mock-lb-status">On Track</span></div>
                    </div>
                    <div className="mock-lb-row">
                      <div className="mock-lb-rank">2</div>
                      <div className="mock-lb-rep"><div className="mock-lb-avatar">BM</div>Brendan Mills</div>
                      <div className="mock-lb-num">19</div>
                      <div className="mock-lb-num plain col-spend">$1,180</div>
                      <div><span className="mock-lb-status">On Track</span></div>
                    </div>
                    <div className="mock-lb-row">
                      <div className="mock-lb-rank">3</div>
                      <div className="mock-lb-rep"><div className="mock-lb-avatar">PN</div>Priya Nair</div>
                      <div className="mock-lb-num">17</div>
                      <div className="mock-lb-num plain col-spend">$940</div>
                      <div><span className="mock-lb-status">On Track</span></div>
                    </div>
                    <div className="mock-lb-row">
                      <div className="mock-lb-rank">4</div>
                      <div className="mock-lb-rep"><div className="mock-lb-avatar">TV</div>Tony Vasquez</div>
                      <div className="mock-lb-num">15</div>
                      <div className="mock-lb-num plain col-spend">$820</div>
                      <div><span className="mock-lb-status">On Track</span></div>
                    </div>
                    <div className="mock-lb-row">
                      <div className="mock-lb-rank">5</div>
                      <div className="mock-lb-rep"><div className="mock-lb-avatar">DO</div>Derek Okafor</div>
                      <div className="mock-lb-num">10</div>
                      <div className="mock-lb-num plain col-spend">$540</div>
                      <div><span className="mock-lb-status watch">Watch</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/**/}
      <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div className="section-header scroll-reveal centered">
            <span className="section-label">What&apos;s missing</span>
            <h2 className="section-heading">Your title software runs the deal. <span className="accent">Nothing manages your book.</span></h2>
          </div>
      
          <div className="compare scroll-reveal">
            <table className="compare-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Everything else</th>
                  <th className="highlight-col">{BRAND.name}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="row-label">Built for</td>
                  <td className="neg">The file</td>
                  <td className="highlight-cell">The field</td>
                </tr>
                <tr>
                  <td className="row-label">Optimizes</td>
                  <td className="neg">Transactions</td>
                  <td className="highlight-cell">Relationships</td>
                </tr>
                <tr>
                  <td className="row-label">Activity types</td>
                  <td className="neg">Generic</td>
                  <td className="highlight-cell">Title-native</td>
                </tr>
                <tr>
                  <td className="row-label">Scores contacts</td>
                  <td className="neg">No</td>
                  <td className="highlight-cell">Yes, on four dimensions</td>
                </tr>
                <tr>
                  <td className="row-label">Tracks spend per activity</td>
                  <td className="neg">No</td>
                  <td className="highlight-cell">Yes</td>
                </tr>
                <tr>
                  <td className="row-label">Connects effort to revenue</td>
                  <td className="neg">No</td>
                  <td className="highlight-cell">Yes</td>
                </tr>
                <tr>
                  <td className="row-label">Built for title agencies</td>
                  <td className="neg">No</td>
                  <td className="highlight-cell">From day one</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
      
      {/**/}
      <section id="audiences">
        <div className="container">
          <div className="section-header scroll-reveal centered">
            <span className="section-label">A day in the field</span>
            <h2 className="section-heading">Two views. Same goal. <span className="accent">Stronger relationships.</span></h2>
          </div>
      
          <div className="day-grid scroll-reveal stagger-reveal">
            <div className="day-card">
              <div className="day-card-label">For the field rep</div>
              <h3>You stop chasing. You start showing up.</h3>
              <p>Two taps to log. Follow-ups set themselves. Tomorrow&apos;s relationships, ready.</p>
            </div>
            <div className="day-card">
              <div className="day-card-label">For the sales manager</div>
              <h3>You stop guessing. You start coaching.</h3>
              <p>Every rep&apos;s book, in one view. Who&apos;s on track, who&apos;s coasting, who&apos;s at risk.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/**/}
      <section style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="container">
          <div className="section-header scroll-reveal centered">
            <span className="section-label">Inside {BRAND.name}</span>
            <h2 className="section-heading">Everything you need. <span className="accent">Nothing you don&apos;t.</span></h2>
          </div>
      
          <div className="feature-grid scroll-reveal stagger-reveal">
            <div className="feature-tile">
              <span className="feature-tile-num">01</span>
              <h3>Activity Logging</h3>
              <p>Title-native types. One screen. Built mobile-first.</p>
            </div>
            <div className="feature-tile">
              <span className="feature-tile-num">02</span>
              <h3>Relationship Scoring</h3>
              <p>Every contact rated zero to one hundred, across four dimensions.</p>
            </div>
            <div className="feature-tile">
              <span className="feature-tile-num">03</span>
              <h3>Smart Follow-ups</h3>
              <p>Overdue, this week, upcoming. Complete or push, one tap each.</p>
            </div>
            <div className="feature-tile">
              <span className="feature-tile-num">04</span>
              <h3>The Manager&apos;s View</h3>
              <p>Leaderboards, heatmaps, per-rep deep dives. MTD, QTD, YTD.</p>
            </div>
            <div className="feature-tile">
              <span className="feature-tile-num">05</span>
              <h3>Contract &amp; Cost Tracking</h3>
              <p>Spend per contact, per activity, per rep. ROI, finally answered.</p>
            </div>
            <div className="feature-tile">
              <span className="feature-tile-num">06</span>
              <h3>Built-in AI</h3>
              <p>Daily nudges, performance summaries, voice logging, coaching prompts.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/**/}
      <section className="story" id="story">
        <div className="container story-inner">
          <h2 className="story-heading scroll-reveal">The title industry has never really been about transactions. It has always been about <span className="accent">people.</span></h2>
      
          <div className="story-pullout scroll-reveal">
            <p>The realtor you checked in on three months ago.</p>
            <p>The lender who sent you their first deal.</p>
            <p>The builder you met at an event.</p>
            <p>The client who just needed someone to answer the phone and care.</p>
          </div>
      
          <p className="story-tag scroll-reveal">That&apos;s your book of business. {BRAND.name} is how you protect it.</p>
        </div>
      </section>
      
      {/**/}
      <section id="status">
        <div className="container">
          <div className="wfg-banner scroll-reveal">
            <div className="wfg-label">Built by</div>
            <div className="wfg-banner-logo">
              <Image
                className="wfg-logo for-dark"
                src="/images/logo/wfg_full_dark.png"
                alt="WFG National Title Insurance Company — a Williston Financial Group company"
                width={1856}
                height={441}
                unoptimized
                style={{ width: '100%', height: 'auto' }}
              />
              <Image
                className="wfg-logo for-light"
                src="/images/logo/wfg_full_light.png"
                alt="WFG National Title Insurance Company — a Williston Financial Group company"
                width={1199}
                height={287}
                unoptimized
                style={{ width: '100%', height: 'auto' }}
              />
            </div>
            <h3>A Williston Financial Group product.</h3>
            <p>In alpha with WFG field teams today. Beta opens next to a small group of affiliated agencies, by referral code. Request access and we&apos;ll add your agency to the beta waitlist.</p>
          </div>
        </div>
      </section>
      
      {/* Deliberately low-key: it sits directly above the primary CTA, so it
          must not compete with it. Quiet band, secondary button. */}
      <section className="signin-band">
        <div className="container signin-inner">
          <div className="signin-copy">
            <h3>Already testing with us?</h3>
            <p>Alpha testers and agencies already onboarded, head straight in.</p>
          </div>
          <div className="signin-actions">
            <Link href="/login" className="btn btn-secondary">Sign in</Link>
            <Link href="/signup" className="signin-alt">Have a code? Create your account →</Link>
          </div>
        </div>
      </section>

      {/**/}
      <section className="closing" id="request">
        <div className="container closing-inner">
          <h2 className="scroll-reveal">Built for the people behind every <span className="accent">closing table.</span></h2>
          <p className="closing-sub scroll-reveal">Be among the first agencies to put it in the field.</p>
          <div className="closing-cta-group scroll-reveal">
            <a href="#request" className="btn btn-primary" onClick={(e) => { e.preventDefault(); setModalOpen(true) }}>Request early access →</a>
            <a href="#product" className="btn btn-secondary">See how it works</a>
          </div>
        </div>
      </section>
      
      {/**/}
      <footer>
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <a href="#" className="nav-logo">
                <Image src="/images/logo/lockup_dark.svg" alt={BRAND.name} width={160} height={58} unoptimized style={{ width: 160, height: 'auto' }} />
              </a>
              <p>Because growth starts in the field. Built for the title industry. With the title industry.</p>
            </div>
            <div className="footer-col">
              <h5>Product</h5>
              <ul>
                <li><a href="#product">What it is</a></li>
                <li><a href="#status">Where we are</a></li>
                <li><a href="#request" onClick={(e) => { e.preventDefault(); setModalOpen(true) }}>Request access</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Audiences</h5>
              <ul>
                <li><a href="#audiences">For field reps</a></li>
                <li><a href="#audiences">For sales managers</a></li>
                <li><a href="#request">For agencies</a></li>
              </ul>
            </div>
            <div className="footer-col">
              <h5>Company</h5>
              <ul>
                <li><a href="#story">Our story</a></li>
                <li><a href="#request" onClick={(e) => { e.preventDefault(); setModalOpen(true) }}>Contact</a></li>
                <li><a href="#status">With WFG</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div>{BRAND.legal}</div>
            <div className="footer-wfg">
              <span className="footer-wfg-label">Built by</span>
              <Image
                className="wfg-logo for-dark"
                src="/images/logo/wfg_full_dark.png"
                alt="WFG National Title Insurance Company — a Williston Financial Group company"
                width={1856}
                height={441}
                unoptimized
                style={{ height: 40, width: 'auto' }}
              />
              <Image
                className="wfg-logo for-light"
                src="/images/logo/wfg_full_light.png"
                alt="WFG National Title Insurance Company — a Williston Financial Group company"
                width={1199}
                height={287}
                unoptimized
                style={{ height: 40, width: 'auto' }}
              />
            </div>
          </div>
        </div>
      </footer>

      <EarlyAccessModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
