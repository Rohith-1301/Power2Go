import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

interface Message {
  role: 'user' | 'bot';
  text: string;
  time: string;
}

const LANGUAGES = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'ta', label: '🇮🇳 தமிழ்' },
  { code: 'hi', label: '🇮🇳 हिंदी' },
  { code: 'te', label: '🇮🇳 తెలుగు' },
];

const SPEECH_LANG_CODES: Record<string, string> = {
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
  te: 'te-IN',
};

const MIC_HINTS: Record<string, string> = {
  en: '🎙️ Listening in English... Speak your question now',
  ta: '🎙️ தமிழில் கேட்கிறது... உங்கள் கேள்வியைப் பேசவும்',
  hi: '🎙️ हिंदी में सुन रहे हैं... अपना प्रश्न बोलिए',
  te: '🎙️ తెలుగులో వింటున్నాము... మీ ప్రశ్నను మాట్లాడండి',
};

const QUICK_QUESTIONS: Record<string, string[]> = {
  en: ['My EV battery is dead', 'How much does charging cost?', 'My car makes a noise', 'Plan a trip', 'Book a charging slot'],
  ta: ['என் EV பேட்டரி தீர்ந்தது', 'சார்ஜிங் செலவு என்ன?', 'என் கார் சத்தம் எழுப்புகிறது', 'பயணத்தை திட்டமிடு', 'சார்ஜிங் ஸ்லாட் முன்பதிவு'],
  hi: ['मेरी EV बैटरी खत्म हो गई', 'चार्जिंग की कीमत क्या है?', 'मेरी कार शोर करती है', 'यात्रा की योजना बनाएं', 'चार्जिंग स्लॉट बुक करें'],
  te: ['నా EV బ్యాటరీ ఖాళీ అయింది', 'చార్జింగ్ ఖర్చు ఎంత?', 'నా కారు శబ్దం చేస్తోంది', 'ప్రయాణాన్ని ప్లాన్ చేయి', 'చార్జింగ్ స్లాట్ బుక్ చేయి'],
};

const PLACEHOLDERS: Record<string, string> = {
  en: 'Type question or use mic 🎙️...',
  ta: 'கேள்வியை தட்டச்சு செய்யவும் அல்லது மைக்கை அழுத்தவும் 🎙️...',
  hi: 'सवाल टाइप करें या माइक दबाएं 🎙️...',
  te: 'ప్రశ్నను టైప్ చేయండి లేదా మైక్ వాడండి 🎙️...',
};

const GREETINGS: Record<string, string> = {
  en: "👋 Hi! I'm **Power Bot**, your AI assistant for EV help.\n\nI can help with charging, repairs, trip planning, and more. Ask me anything or speak using the mic 🎙️!",
  ta: "👋 வணக்கம்! நான் **Power Bot**, உங்கள் EV உதவி AI.\n\nசார்ஜிங், பழுதுநீக்கம், பயணத் திட்டம் ஆகியவற்றில் நான் உதவுவேன். மைக்கை 🎙️ அழுத்தி தமிழிலேயே பேசலாம்!",
  hi: "👋 नमस्ते! मैं **Power Bot** हूँ, आपका EV सहायक AI.\n\nचार्जिंग, मरम्मत और यात्रा योजना में मैं मदद कर सकता हूँ। माइक 🎙️ दबाकर हिंदी में पूछें!",
  te: "👋 నమస్కారం! నేను **Power Bot**, మీ EV సహాయ AI.\n\nఛార్జింగ్, మరమ్మతులు మరియు ప్రయాణ ప్రణాళికలో నేను సహాయం చేస్తాను. మైక్ 🎙️ నొక్కి మాట్లాడవచ్చు!",
};

function formatText(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
}

export default function PowerBot() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [language, setLanguage] = useState('en');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(true);
  
  // Voice mic states
  const [isListening, setIsListening] = useState(false);
  const [speechStatus, setSpeechStatus] = useState('');
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Restore saved language on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('power2go_powerbot_lang');
      if (savedLang && ['en', 'ta', 'hi', 'te'].includes(savedLang)) {
        setLanguage(savedLang);
      }
    }
  }, []);

  // Stop pulsing after 8 seconds
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 8000);
    return () => clearTimeout(t);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, speechStatus]);

  // Show greeting when opened first time
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'bot',
        text: GREETINGS[language] || GREETINGS['en'],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  }, [isOpen]);

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('power2go_powerbot_lang', lang);
    }

    // Stop listening if language switched while listening
    if (isListening && recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      setIsListening(false);
      setSpeechStatus('');
    }

    // Append switch greeting in that new language so user gets immediate confirmation
    setMessages(prev => [
      ...prev,
      {
        role: 'bot',
        text: GREETINGS[lang] || GREETINGS['en'],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      setIsListening(false);
      setSpeechStatus('');
      return;
    }

    const SpeechRecognition = typeof window !== 'undefined' && 
      ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

    if (!SpeechRecognition) {
      alert('Voice mic is not supported in this browser. Please try Google Chrome or Microsoft Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      const targetLang = SPEECH_LANG_CODES[language] || 'en-IN';
      recognition.lang = targetLang;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechStatus(MIC_HINTS[language] || '🎙️ Listening... speak now');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript && transcript.trim()) {
          setInput(transcript);
          setIsListening(false);
          setSpeechStatus('');
          // Automatically send the voice question
          sendMessage(transcript.trim());
        } else {
          setIsListening(false);
          setSpeechStatus('');
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event?.error);
        setIsListening(false);
        setSpeechStatus('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setSpeechStatus('');
      };

      recognition.start();
    } catch (err) {
      console.error('Error starting speech recognition:', err);
      setIsListening(false);
      setSpeechStatus('');
    }
  };

  const sendMessage = async (text?: string) => {
    const msgText = (text || input).trim();
    if (!msgText || loading) return;
    setInput('');
    setSpeechStatus('');

    const userMsg: Message = {
      role: 'user',
      text: msgText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msgText, language })
      });
      const data = await res.json();
      setMessages(prev => [...prev, {
        role: 'bot',
        text: data.reply || "I'm having trouble responding right now. Please try again.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch {
      const connectionErrors: Record<string, string> = {
        en: "⚡ Connection issue. Please check your internet connection.",
        ta: "⚡ இணைப்பு பிரச்சனை. உங்கள் இணைய இணைப்பை சரிபார்க்கவும்.",
        hi: "⚡ कनेक्शन में समस्या। कृपया अपना इंटरनेट जांचें।",
        te: "⚡ కనెక్షన్ సమస్య. దయచేసి మీ ఇంటర్నెట్ తనిఖీ చేయండి."
      };
      setMessages(prev => [...prev, {
        role: 'bot',
        text: connectionErrors[language] || connectionErrors['en'],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Don't show on login page
  if (router.pathname === '/') return null;

  return (
    <>
      {/* Floating Button */}
      <button
        id="powerbot-fab"
        onClick={() => { setIsOpen(true); setIsMinimized(false); }}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00aa55, #00cc66)',
          border: 'none',
          cursor: 'pointer',
          display: isOpen && !isMinimized ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0, 170, 85, 0.45)',
          zIndex: 9999,
          animation: pulse ? 'botPulse 2s infinite' : 'none',
          transition: 'transform 0.2s'
        }}
        title="Chat with Power Bot"
      >
        <span style={{ fontSize: '28px' }}>🤖</span>
        {/* Notification dot */}
        <span style={{
          position: 'absolute',
          top: '2px',
          right: '2px',
          width: '14px',
          height: '14px',
          background: '#ff2a5f',
          borderRadius: '50%',
          border: '2px solid white',
          fontSize: '8px',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold'
        }}>1</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          id="powerbot-window"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '380px',
            maxWidth: 'calc(100vw - 24px)',
            height: isMinimized ? '64px' : '560px',
            maxHeight: 'calc(100vh - 48px)',
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            border: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            transition: 'height 0.3s ease'
          }}
        >
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, #00aa55, #00cc66)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>🤖</div>
              <div>
                <div style={{ color: '#fff', fontWeight: 700, fontSize: '0.95rem' }}>Power Bot</div>
                <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.72rem' }}>
                  <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#a3ffcc', marginRight: '4px', verticalAlign: 'middle' }}></span>
                  Multilingual AI Assistant
                </div>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {/* Language Selector */}
              <select
                value={language}
                onChange={e => handleLanguageChange(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.25)',
                  border: '1px solid rgba(255,255,255,0.5)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  padding: '4px 6px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code} style={{ background: '#00aa55', color: 'white' }}>{l.label}</option>
                ))}
              </select>
              <button onClick={() => setIsMinimized(!isMinimized)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px', padding: '0 2px' }}>
                {isMinimized ? '▲' : '▼'}
              </button>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px', padding: '0 2px' }}>
                ✕
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages Area */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                background: '#f8fafc'
              }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-end',
                    gap: '8px'
                  }}>
                    {msg.role === 'bot' && (
                      <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #00aa55, #00cc66)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        flexShrink: 0
                      }}>🤖</div>
                    )}
                    <div style={{ maxWidth: '80%' }}>
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: msg.role === 'user' ? 'linear-gradient(135deg, #00aa55, #00cc66)' : '#ffffff',
                        color: msg.role === 'user' ? '#ffffff' : '#1e293b',
                        fontSize: '0.85rem',
                        lineHeight: '1.5',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                        border: msg.role === 'bot' ? '1px solid #e2e8f0' : 'none'
                      }}
                        dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                      />
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '4px', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                        {msg.time}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #00aa55, #00cc66)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>🤖</div>
                    <div style={{ padding: '10px 16px', borderRadius: '18px 18px 18px 4px', background: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', gap: '4px', alignItems: 'center' }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: '7px', height: '7px', borderRadius: '50%', background: '#00aa55',
                          animation: `botDot 1.2s ${i * 0.2}s infinite ease-in-out`
                        }} />
                      ))}
                    </div>
                  </div>
                )}
                
                {speechStatus && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '12px',
                    background: '#fef2f2',
                    border: '1px dashed #ef4444',
                    color: '#b91c1c',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textAlign: 'center',
                    animation: 'pulse 1.5s infinite'
                  }}>
                    {speechStatus}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Questions */}
              <div style={{
                padding: '8px 12px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                flexShrink: 0,
                background: '#ffffff'
              }}>
                {(QUICK_QUESTIONS[language] || QUICK_QUESTIONS['en']).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '20px',
                      padding: '5px 12px',
                      fontSize: '0.72rem',
                      color: '#15803d',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      fontWeight: 500,
                      transition: 'all 0.2s'
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Input Area with Voice Mic */}
              <div style={{
                padding: '12px 14px',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                gap: '8px',
                background: '#ffffff',
                flexShrink: 0,
                alignItems: 'center'
              }}>
                {/* Voice Mic Button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  title={isListening ? "Listening... click to stop" : `Voice question in ${LANGUAGES.find(l => l.code === language)?.label || 'language'}`}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    border: isListening ? '2px solid #ef4444' : '1.5px solid #e2e8f0',
                    background: isListening ? '#fee2e2' : '#f8fafc',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '20px',
                    flexShrink: 0,
                    animation: isListening ? 'micPulse 1.2s infinite' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {isListening ? '🔴' : '🎙️'}
                </button>

                <input
                  id="powerbot-input"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder={isListening ? "🎙️ Listening... speak now" : (PLACEHOLDERS[language] || PLACEHOLDERS['en'])}
                  disabled={loading}
                  style={{
                    flex: 1,
                    border: isListening ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    fontSize: '0.85rem',
                    outline: 'none',
                    color: '#1e293b',
                    background: isListening ? '#fff5f5' : '#f8fafc',
                    fontFamily: 'inherit'
                  }}
                />

                <button
                  onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: input.trim() && !loading ? 'linear-gradient(135deg, #00aa55, #00cc66)' : '#e2e8f0',
                    border: 'none',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0,
                    transition: 'all 0.2s'
                  }}
                >
                  ➤
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes botPulse {
          0% { box-shadow: 0 4px 20px rgba(0,170,85,0.45); }
          50% { box-shadow: 0 4px 30px rgba(0,170,85,0.8), 0 0 0 12px rgba(0,170,85,0.1); }
          100% { box-shadow: 0 4px 20px rgba(0,170,85,0.45); }
        }
        @keyframes botDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes micPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          50% { transform: scale(1.08); box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        #powerbot-fab:hover { transform: scale(1.08); }
      `}</style>
    </>
  );
}
