import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Play, Pause, AlertCircle } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl?: string;
  scriptText?: string;
  title?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, scriptText, title }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speechSynthesisActive, setSpeechSynthesisActive] = useState(false);
  const [hasError, setHasError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      // Clean up audio & speech on unmount
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const playWithSpeechSynthesis = (text: string) => {
    if (!('speechSynthesis' in window)) {
      setHasError(true);
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95; // Slightly measured pace for emergency clarity
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsPlaying(true);
      setSpeechSynthesisActive(true);
      setHasError(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setSpeechSynthesisActive(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setSpeechSynthesisActive(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const togglePlay = () => {
    if (isPlaying) {
      if (speechSynthesisActive && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setSpeechSynthesisActive(false);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
      return;
    }

    setHasError(false);

    // If mock or offline URL, seamlessly use Web Speech API synthesis
    const isMockUrl = !audioUrl || audioUrl.includes('mock-audio') || audioUrl.includes('.local');
    if (isMockUrl && scriptText) {
      playWithSpeechSynthesis(scriptText);
      return;
    }

    // Try HTML Audio element
    if (audioRef.current && audioUrl) {
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            // If audio play failed (network / CORS / format), fall back to SpeechSynthesis
            if (scriptText) {
              playWithSpeechSynthesis(scriptText);
            } else {
              setHasError(true);
              setIsPlaying(false);
            }
          });
      }
    } else if (scriptText) {
      playWithSpeechSynthesis(scriptText);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  const handleAudioError = () => {
    // If audio element failed while playing, switch to browser speech synthesis if script available
    if (isPlaying && scriptText && !speechSynthesisActive) {
      playWithSpeechSynthesis(scriptText);
    }
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.9)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '12px',
      padding: '14px 18px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <button
          onClick={togglePlay}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: isPlaying ? 'var(--accent-cyan)' : 'rgba(255, 255, 255, 0.1)',
            color: isPlaying ? '#000' : '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            flexShrink: 0
          }}
          title={isPlaying ? 'Pause' : 'Play Voice Alert Audio'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Volume2 size={15} color="var(--accent-cyan)" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {title || 'Polly Neural Voice (Joanna) - Emergency Alert Audio'}
            </span>
          </div>
          {scriptText && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
              "{scriptText.length > 90 ? `${scriptText.slice(0, 90)}...` : scriptText}"
            </div>
          )}
          {hasError && (
            <div style={{ fontSize: '0.75rem', color: '#fda4af', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={12} />
              Audio stream currently unavailable
            </div>
          )}
        </div>
      </div>

      {isPlaying && (
        <div className="audio-wave">
          <div className="audio-bar"></div>
          <div className="audio-bar"></div>
          <div className="audio-bar"></div>
          <div className="audio-bar"></div>
          <div className="audio-bar"></div>
        </div>
      )}

      {audioUrl && !audioUrl.includes('mock-audio') && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="none"
          onEnded={handleEnded}
          onError={handleAudioError}
        />
      )}
    </div>
  );
};
