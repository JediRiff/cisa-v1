'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ThreatData {
  score: { score: number; label: string; color: string; factors: any[] }
  threats: { all: any[]; energyRelevant: any[] }
  kev: any[]
  meta: {
    sourcesOnline: number
    sourcesTotal: number
    totalItems: number
    errors: string[]
  }
}

function RetroMarquee({ children, speed = 'normal' }: { children: React.ReactNode; speed?: string }) {
  const duration = speed === 'fast' ? '8s' : speed === 'slow' ? '20s' : '14s'
  return (
    <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
      <div style={{
        display: 'inline-block',
        animation: `marquee ${duration} linear infinite`,
        whiteSpace: 'nowrap',
      }}>
        {children}
      </div>
    </div>
  )
}

function BlinkText({ children }: { children: React.ReactNode }) {
  return <span style={{ animation: 'retro-blink 1s step-end infinite' }}>{children}</span>
}

function RetroButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: '#c0c0c0',
        border: '2px outset #ffffff',
        padding: '4px 16px',
        fontFamily: '"MS Sans Serif", Arial, sans-serif',
        fontSize: '12px',
        cursor: 'pointer',
        fontWeight: 'bold',
      }}
    >
      {children}
    </button>
  )
}

function RainbowHR() {
  return (
    <div style={{
      height: '4px',
      background: 'linear-gradient(90deg, red, orange, yellow, green, blue, indigo, violet)',
      margin: '12px 0',
    }} />
  )
}

export default function CoolToolsTown() {
  const [data, setData] = useState<ThreatData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [visitorCount] = useState(() => Math.floor(Math.random() * 900) + 1337)
  const [showGuestbook, setShowGuestbook] = useState(false)

  useEffect(() => {
    fetch('/api/threats')
      .then(res => {
        if (!res.ok) throw new Error('Feed broke')
        return res.json()
      })
      .then(json => { setData(json); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [])

  const getRetroLabel = (label: string) => {
    if (label === 'Severe') return "WE'RE ALL GONNA DIE"
    if (label === 'Elevated') return 'KINDA SKETCHY NGL'
    return "VIBIN'"
  }

  const getRetroColor = (label: string) => {
    if (label === 'Severe') return '#ff0000'
    if (label === 'Elevated') return '#ffff00'
    return '#00ff00'
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        @keyframes retro-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes rainbow-text {
          0% { color: #ff0000; }
          16% { color: #ff8800; }
          33% { color: #ffff00; }
          50% { color: #00ff00; }
          66% { color: #0088ff; }
          83% { color: #8800ff; }
          100% { color: #ff0000; }
        }
        .rainbow-animate { animation: rainbow-text 3s linear infinite; }
      ` }} />

      <div style={{
        background: '#000033',
        backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        minHeight: '100vh',
        fontFamily: '"Times New Roman", Times, serif',
        color: '#00ff00',
      }}>
        {/* Top Bar - Yahoo! GeoCities style */}
        <div style={{
          background: 'linear-gradient(180deg, #6666cc 0%, #333399 100%)',
          padding: '8px 16px',
          borderBottom: '2px solid #9999ff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#ffffff', fontFamily: 'Impact, sans-serif' }}>
              Cool Tools Town
            </span>
            <span style={{ color: '#ccccff', fontSize: '11px' }}>- A CyberAlley Production</span>
          </div>
          <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
            <Link href="/" style={{ color: '#ffff00', textDecoration: 'underline' }}>Back to Reality</Link>
            <span style={{ color: '#ccccff' }}>|</span>
            <span style={{ color: '#ccccff' }}>Help</span>
          </div>
        </div>

        {/* Toolbar - Windows 95 style */}
        <div style={{
          background: '#c0c0c0',
          padding: '4px 8px',
          borderBottom: '2px groove #808080',
          display: 'flex',
          gap: '4px',
          flexWrap: 'wrap',
        }}>
          <RetroButton onClick={() => window.location.reload()}>&#128196; VIEW THREATS</RetroButton>
          <RetroButton>&#128202; CHECK SCORE</RetroButton>
          <RetroButton onClick={() => alert('AAAHHH!! THE HACKERS ARE COMING!!!')}>&#128680; PANIC BUTTON</RetroButton>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: '11px', color: '#808080', alignSelf: 'center', fontFamily: 'Arial, sans-serif' }}>
            Best viewed in Netscape Navigator 4.0 at 800x600
          </span>
        </div>

        {/* Welcome banner */}
        <div style={{ background: '#000066', padding: '4px 16px', borderBottom: '1px solid #3333ff' }}>
          <span style={{ color: '#ccccff', fontSize: '12px', fontFamily: 'Arial, sans-serif' }}>
            Welcome, Guest - [<a href="https://github.com/JediRiff/cisa-v1" target="_blank" rel="noopener noreferrer" style={{ color: '#ffff00' }}>Sign In</a>]
          </span>
          <span style={{ float: 'right', color: '#ccccff', fontSize: '12px', fontFamily: 'Arial, sans-serif' }}>
            <a href="https://github.com/JediRiff/cisa-v1/issues/new" target="_blank" rel="noopener noreferrer" style={{ color: '#ffff00' }}>Get a free home page</a>
          </span>
        </div>

        {/* Marquee */}
        <div style={{ background: '#000000', padding: '6px 0', borderBottom: '2px solid #333333' }}>
          <RetroMarquee speed="normal">
            <span style={{ color: '#ff0000', fontSize: '14px', fontWeight: 'bold' }}>
              &#9733; WELCOME TO COOL TOOLS TOWN &#9733; Your #1 Source for CYBER THREAT INTELLIGENCE &#9733; NOW WITH 100% MORE BLINKING TEXT &#9733; THIS SITE IS Y2K COMPLIANT &#9733; POWERED BY HAMSTER WHEELS AND DIAL-UP &#9733;
            </span>
          </RetroMarquee>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>

          {/* Under Construction Banner */}
          <div style={{ textAlign: 'center', margin: '16px 0', padding: '8px', background: '#ffff00', color: '#000000', border: '3px dashed #ff0000' }}>
            <span style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'Comic Sans MS, cursive' }}>
              &#128679; UNDER CONSTRUCTION &#128679; We&apos;re always adding more cool cyber tools! &#128679;
            </span>
          </div>

          {/* Main Content - Table Layout */}
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '2px ridge #808080' }} cellPadding={8}>
            <tbody>
              <tr>
                {/* Left Column - Score */}
                <td style={{ width: '60%', verticalAlign: 'top', background: '#000033', border: '1px solid #333366' }}>

                  {/* CYBER DANGER-O-METER */}
                  <div style={{ textAlign: 'center', padding: '16px' }}>
                    <h1 style={{
                      fontSize: '28px',
                      fontFamily: 'Impact, sans-serif',
                      color: '#ff6600',
                      textShadow: '2px 2px #000000',
                      margin: '0 0 8px 0',
                    }}>
                      &#9889; CYBER DANGER-O-METER &#9889;
                    </h1>

                    <RainbowHR />

                    {loading ? (
                      <div style={{ padding: '20px' }}>
                        <BlinkText>
                          <span style={{ color: '#00ff00', fontSize: '18px' }}>LOADING... PLEASE WAIT...</span>
                        </BlinkText>
                        <br />
                        <span style={{ color: '#808080', fontSize: '11px' }}>(Your 56k modem is working hard)</span>
                      </div>
                    ) : data?.score ? (
                      <>
                        <div style={{
                          display: 'inline-block',
                          padding: '24px 32px',
                          border: `4px double ${getRetroColor(data.score.label)}`,
                          background: '#000000',
                          margin: '12px 0',
                        }}>
                          <div style={{
                            fontSize: '72px',
                            fontWeight: 'bold',
                            fontFamily: '"Courier New", Courier, monospace',
                            color: getRetroColor(data.score.label),
                            textShadow: `0 0 20px ${getRetroColor(data.score.label)}, 0 0 40px ${getRetroColor(data.score.label)}`,
                            lineHeight: 1,
                          }}>
                            {data.score.score.toFixed(1)}
                          </div>
                        </div>
                        <br />
                        <BlinkText>
                          <span style={{
                            fontSize: '22px',
                            fontFamily: 'Impact, sans-serif',
                            color: getRetroColor(data.score.label),
                            textShadow: '1px 1px #000000',
                          }}>
                            {getRetroLabel(data.score.label)}
                          </span>
                        </BlinkText>
                        <p style={{ color: '#808080', fontSize: '11px', marginTop: '8px' }}>
                          (This number is totally real and not made up)
                        </p>
                      </>
                    ) : (
                      <div style={{ padding: '20px' }}>
                        <p style={{ color: '#ff0000', fontSize: '16px', fontWeight: 'bold' }}>
                          {error ? 'ERROR 500: THE HAMSTER POWERING OUR SERVER FELL OFF THE WHEEL' : 'ERROR 404: DANGER NOT FOUND (jk we broke something)'}
                        </p>
                        <p style={{ color: '#808080', fontSize: '11px', marginTop: '8px' }}>
                          Try hitting that VIEW THREATS button up top
                        </p>
                      </div>
                    )}

                    <RainbowHR />

                    {/* CISA Points */}
                    {data?.score?.factors && data.score.factors.length > 0 && (
                      <div style={{ textAlign: 'left', marginTop: '12px' }}>
                        <h2 style={{
                          fontSize: '18px',
                          fontFamily: 'Impact, sans-serif',
                          color: '#ff6600',
                          textShadow: '1px 1px #000000',
                        }}>
                          &#128176; CISA Points &#128176;
                        </h2>
                        <table style={{
                          width: '100%',
                          border: '1px solid #333366',
                          borderCollapse: 'collapse',
                          fontSize: '12px',
                          fontFamily: '"Courier New", Courier, monospace',
                          marginTop: '8px',
                        }}>
                          <thead>
                            <tr style={{ background: '#333366' }}>
                              <th style={{ border: '1px solid #666699', padding: '4px', color: '#ffff00', textAlign: 'left' }}>The Scary Stuff</th>
                              <th style={{ border: '1px solid #666699', padding: '4px', color: '#ffff00', textAlign: 'center' }}>Damage</th>
                              <th style={{ border: '1px solid #666699', padding: '4px', color: '#ffff00', textAlign: 'center' }}>Count</th>
                            </tr>
                          </thead>
                          <tbody>
                            {data.score.factors.map((f: any, i: number) => (
                              <tr key={i} style={{ background: i % 2 === 0 ? '#000033' : '#000044' }}>
                                <td style={{ border: '1px solid #333366', padding: '4px', color: '#00ff00' }}>{f.name}</td>
                                <td style={{ border: '1px solid #333366', padding: '4px', color: '#ff0000', textAlign: 'center' }}>{f.impact.toFixed(1)}</td>
                                <td style={{ border: '1px solid #333366', padding: '4px', color: '#00ffff', textAlign: 'center' }}>{f.count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </td>

                {/* Right Column - Sidebar */}
                <td style={{ width: '40%', verticalAlign: 'top', background: '#000044', border: '1px solid #333366', padding: '12px' }}>

                  {/* New and Notable */}
                  <div style={{
                    border: '2px ridge #808080',
                    background: '#ffffcc',
                    padding: '8px',
                    marginBottom: '12px',
                  }}>
                    <h3 style={{
                      fontSize: '14px',
                      fontFamily: 'Arial, sans-serif',
                      color: '#990000',
                      fontWeight: 'bold',
                      margin: '0 0 6px 0',
                      borderBottom: '1px solid #cc9900',
                      paddingBottom: '4px',
                    }}>
                      <BlinkText>&#10024; NEW!</BlinkText> What&apos;s Hot
                    </h3>
                    <ul style={{
                      margin: 0,
                      padding: '0 0 0 16px',
                      fontSize: '11px',
                      fontFamily: 'Arial, sans-serif',
                      color: '#333333',
                      lineHeight: '1.6',
                    }}>
                      <li>Cool Tools Town has a <span style={{ color: '#ff0000', fontWeight: 'bold' }}>new design</span>!</li>
                      <li>Now tracking {data?.meta?.sourcesOnline ?? '??'} spy networks</li>
                      <li>AI-powered threat brain installed</li>
                      <li>Y2K bug: still patching</li>
                    </ul>
                  </div>

                  {/* Explore Neighborhoods */}
                  <div style={{ marginBottom: '12px' }}>
                    <h3 style={{
                      fontSize: '14px',
                      fontFamily: 'Arial, sans-serif',
                      color: '#ffff00',
                      fontWeight: 'bold',
                      margin: '0 0 8px 0',
                    }}>
                      Explore Neighborhoods
                    </h3>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '4px',
                      fontSize: '12px',
                    }}>
                      {['CyberAlley', 'FirewallFlats', 'PatchworkPark', 'VulnValley', 'MalwareMeadows', 'ExploitEstates'].map(name => (
                        <a key={name} href="#" style={{ color: '#0000ff', textDecoration: 'underline', fontFamily: 'Arial, sans-serif' }}
                          onClick={(e) => { e.preventDefault(); alert(`Welcome to ${name}! (Coming Soon\u2122)`) }}>
                          {name}
                        </a>
                      ))}
                    </div>
                  </div>

                  {/* Visitor Counter */}
                  <div style={{
                    textAlign: 'center',
                    padding: '8px',
                    background: '#000000',
                    border: '2px inset #808080',
                    marginBottom: '12px',
                  }}>
                    <span style={{ color: '#00ff00', fontSize: '10px', fontFamily: '"Courier New", monospace' }}>
                      YOU ARE VISITOR #
                    </span>
                    <br />
                    <span style={{
                      color: '#00ff00',
                      fontSize: '24px',
                      fontFamily: '"Courier New", monospace',
                      fontWeight: 'bold',
                      textShadow: '0 0 10px #00ff00',
                    }}>
                      {String(visitorCount).padStart(7, '0')}
                    </span>
                  </div>

                  {/* Feed Status */}
                  {data?.meta && (
                    <div style={{ marginBottom: '12px' }}>
                      <h3 style={{
                        fontSize: '13px',
                        fontFamily: 'Impact, sans-serif',
                        color: '#ff6600',
                        margin: '0 0 6px 0',
                      }}>
                        &#128373; Our Super Secret Spy Network
                      </h3>
                      <div style={{ fontSize: '10px', fontFamily: '"Courier New", monospace' }}>
                        <div style={{ color: '#00ff00', marginBottom: '2px' }}>
                          [ONLINE] {data.meta.sourcesOnline} of {data.meta.sourcesTotal} feeds active
                        </div>
                        <div style={{ color: '#00ffff', marginBottom: '2px' }}>
                          [ITEMS] {data.meta.totalItems} threats collected
                        </div>
                        {data.meta.errors.length > 0 && (
                          <div style={{ color: '#ff0000', marginBottom: '2px' }}>
                            [DEAD] {data.meta.errors.length} feed(s) down
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <RainbowHR />

          {/* CISA Master Priorities */}
          {data?.kev && data.kev.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h2 style={{
                fontSize: '22px',
                fontFamily: 'Impact, sans-serif',
                color: '#ff0000',
                textShadow: '2px 2px #000000',
                textAlign: 'center',
              }}>
                &#128680; CISA MASTER PRIORITIES &#128680;
              </h2>
              <p style={{ textAlign: 'center', color: '#808080', fontSize: '11px', fontFamily: 'Arial, sans-serif' }}>
                (a.k.a. stuff you REALLY need to patch like... yesterday)
              </p>

              <table style={{
                width: '100%',
                border: '2px ridge #808080',
                borderCollapse: 'collapse',
                marginTop: '8px',
                fontSize: '11px',
                fontFamily: '"Courier New", monospace',
              }}>
                <thead>
                  <tr style={{ background: '#990000' }}>
                    <th style={{ border: '1px solid #666666', padding: '6px', color: '#ffffff', textAlign: 'left' }}>CVE</th>
                    <th style={{ border: '1px solid #666666', padding: '6px', color: '#ffffff', textAlign: 'left' }}>Vendor</th>
                    <th style={{ border: '1px solid #666666', padding: '6px', color: '#ffffff', textAlign: 'left' }}>Product</th>
                    <th style={{ border: '1px solid #666666', padding: '6px', color: '#ffffff', textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.kev.slice(0, 8).map((kev: any, i: number) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#000033' : '#000044' }}>
                      <td style={{ border: '1px solid #333366', padding: '4px', color: '#00ffff' }}>{kev.cveId}</td>
                      <td style={{ border: '1px solid #333366', padding: '4px', color: '#00ff00' }}>{kev.vendor}</td>
                      <td style={{ border: '1px solid #333366', padding: '4px', color: '#ffffff' }}>{kev.product}</td>
                      <td style={{ border: '1px solid #333366', padding: '4px', textAlign: 'center' }}>
                        {kev.isOverdue ? (
                          <BlinkText><span style={{ color: '#ff0000', fontWeight: 'bold' }}>!! OVERDUE !!</span></BlinkText>
                        ) : (
                          <span style={{ color: '#ffff00' }}>PATCH NOW</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <RainbowHR />

          {/* Power Grid Panic Zone */}
          {data?.threats && (
            <div style={{ marginTop: '16px' }}>
              <h2 style={{
                fontSize: '20px',
                fontFamily: 'Impact, sans-serif',
                color: '#ffff00',
                textShadow: '2px 2px #000000',
                textAlign: 'center',
              }}>
                &#9889; POWER GRID PANIC ZONE &#9889;
              </h2>
              <p style={{ textAlign: 'center', color: '#808080', fontSize: '11px', fontFamily: 'Arial, sans-serif', marginBottom: '8px' }}>
                Energy sector threats that keep us up at night
              </p>
              {data.threats.energyRelevant.slice(0, 5).map((item: any, i: number) => (
                <div key={i} style={{
                  border: '1px solid #333366',
                  background: '#000022',
                  padding: '8px',
                  marginBottom: '6px',
                }}>
                  <a href={item.link} target="_blank" rel="noopener noreferrer" style={{
                    color: '#0000ff',
                    textDecoration: 'underline',
                    fontSize: '13px',
                    fontWeight: 'bold',
                  }}>
                    {item.title}
                  </a>
                  <div style={{ color: '#808080', fontSize: '10px', marginTop: '2px' }}>
                    Source: {item.source} | {new Date(item.pubDate).toLocaleDateString()}
                    {item.aiSeverityScore && (
                      <span style={{ color: item.aiSeverityScore >= 7 ? '#ff0000' : '#ffff00', marginLeft: '8px' }}>
                        [DANGER LEVEL: {item.aiSeverityScore}/10]
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {data.threats.energyRelevant.length === 0 && (
                <p style={{ color: '#00ff00', textAlign: 'center', fontSize: '12px' }}>
                  &#10004; The grid is safe... for now... *dramatic music*
                </p>
              )}
            </div>
          )}

          <RainbowHR />

          {/* Guestbook / Methodology */}
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <h3 style={{
                fontSize: '16px',
                fontFamily: 'Impact, sans-serif',
                color: '#ff6600',
              }}>
                &#128214; How We Do The Math (trust us bro)
              </h3>
              <div style={{
                background: '#ffffcc',
                border: '2px inset #808080',
                padding: '8px',
                fontSize: '11px',
                fontFamily: 'Arial, sans-serif',
                color: '#333333',
              }}>
                <p>We start at 5.0 points (VIBIN&apos;) and subtract points for bad stuff:</p>
                <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                  <li>&#128128; Nation-state hackers = BIG yikes (-0.4 each)</li>
                  <li>&#128027; Known exploited vulns = medium yikes (-0.3 each)</li>
                  <li>&#9889; ICS/SCADA problems = uh oh (-0.3 each)</li>
                  <li>&#129302; AI says it&apos;s bad = variable yikes (-0.1 to -0.4)</li>
                  <li>&#128226; Vendor alerts = smol yikes (-0.15 each)</li>
                </ul>
                <p style={{ fontSize: '10px', color: '#808080', marginTop: '4px' }}>
                  *This methodology has been peer-reviewed by exactly zero academics
                </p>
              </div>
            </div>

            <div style={{ flex: 1, minWidth: '250px' }}>
              <h3 style={{
                fontSize: '16px',
                fontFamily: 'Impact, sans-serif',
                color: '#ff6600',
              }}>
                &#128221; Sign Our Guestbook!!
              </h3>
              <div style={{
                background: '#000000',
                border: '2px inset #808080',
                padding: '8px',
                textAlign: 'center',
              }}>
                {!showGuestbook ? (
                  <>
                    <p style={{ color: '#00ff00', fontSize: '12px', marginBottom: '8px' }}>
                      Tell us what you think about our RADICAL website!
                    </p>
                    <RetroButton onClick={() => setShowGuestbook(true)}>&#9997; Sign Guestbook</RetroButton>
                  </>
                ) : (
                  <>
                    <p style={{ color: '#00ff00', fontSize: '12px', marginBottom: '8px' }}>
                      JK, we use GitHub like normal people now &#128514;
                    </p>
                    <a
                      href="https://github.com/JediRiff/cisa-v1/issues/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#00ffff', textDecoration: 'underline', fontSize: '13px' }}
                    >
                      &#128279; Submit Feedback on GitHub
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          <RainbowHR />

          {/* Footer */}
          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: '10px', fontFamily: 'Arial, sans-serif' }}>
            <p style={{ color: '#808080' }}>
              &#169; 2026 Cool Tools Town | A CyberAlley Neighborhood Production
            </p>
            <p style={{ color: '#666666', marginTop: '4px' }}>
              Webmaster: <a href="mailto:CISA_h4x0r_2026@aol.com" style={{ color: '#0000ff' }}>CISA_h4x0r_2026@aol.com</a>
            </p>
            <p style={{ color: '#666666', marginTop: '4px' }}>
              &#128187; This page is Y2K compliant &#128187; | Made with &#128150; and dial-up
            </p>
            <p style={{ color: '#444444', marginTop: '8px' }}>
              <Link href="/" style={{ color: '#0000ff', textDecoration: 'underline' }}>
                &#8592; Return to the boring professional version
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
