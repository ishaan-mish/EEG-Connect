import { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import './App.css';

// --- NEW COMPONENT: Neural Brain Visual ---
const BrainVisual = ({ isActive, currentMood }) => {
  return (
    <div className="brain-visual-container">
      <svg className={`brain-svg ${isActive ? 'active' : ''}`} viewBox="0 0 100 100">
        {/* Outer ring: Lavender when inactive, Gold when active */}
        <circle cx="50" cy="50" r="48" stroke={isActive ? "#ffd700" : "#bba2be"} strokeWidth="0.5" strokeDasharray="2 4" opacity="0.3" />

        <path
          className="brain-hemisphere"
          d="M52 25C65 25 75 35 75 50C75 65 65 75 52 75V25Z"
          // Inactive color changed to Lavender for light theme visibility
          stroke={isActive ? "#ffd700" : "#bba2be"}
          strokeWidth="2"
          fill="none"
          opacity={isActive ? "1" : "0.5"}
        />
        <path
          className="brain-hemisphere"
          d="M48 25C35 25 25 35 25 50C25 65 35 75 48 75V25Z"
          // Inactive color changed to Lavender
          stroke={isActive ? "#ffd700" : "#bba2be"}
          strokeWidth="2"
          fill="none"
          opacity={isActive ? "1" : "0.5"}
        />
        {/* Center line: Lavender */}
        <line x1="50" y1="28" x2="50" y2="72" stroke="#bba2be" strokeWidth="1" />

        {isActive && (
          <g className="neural-pulses">
            {/* Gold and Lavender active pulses */}
            <circle cx="50" cy="35" r="2" fill="#ffd700"><animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" /></circle>
            <circle cx="65" cy="50" r="1.5" fill="#bba2be"><animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" /></circle>
            <circle cx="35" cy="50" r="1.5" fill="#bba2be"><animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite" /></circle>
          </g>
        )}
      </svg>
    </div>
  );
};

// --- CONFIGURATION ---
const DOWNLOAD_LINK = "https://drive.google.com/file/d/1tGc3_5BkNtKcSppOqPk-0YfAbxhkD1xQ/view?usp=sharing";
const WEBSOCKET_URL = 'ws://localhost:8000/ws';

const lottieUrls = {
  POSITIVE: 'https://lottie.host/embed/89eecf10-004f-49d4-81ad-bb3c058f8215/OjEH4ixGXY.lottie',
  NEUTRAL: 'https://lottie.host/embed/10619131-93d1-470e-b8b7-7c2bbb87aa84/FX54B98OTA.lottie',
  NEGATIVE: 'https://lottie.host/embed/ace77aff-70a6-43ef-979c-abad404699c3/QnVjTw4Jod.lottie',
  Analyzing: 'https://lottie.host/embed/10619131-93d1-470e-b8b7-7c2bbb87aa84/FX54B98OTA.lottie',
  '---': 'https://lottie.host/embed/10619131-93d1-470e-b8b7-7c2bbb87aa84/FX54B98OTA.lottie',
};

const formatChartData = (predictions) => {
  const moodToNumber = { POSITIVE: 1, NEUTRAL: 0, NEGATIVE: -1 };
  return predictions.map((pred) => ({
    time: pred.time,
    moodValue: moodToNumber[pred.emotion],
    mood: pred.emotion,
  })).reverse();
};

const generateCsvContent = (predictions) => {
  const headers = "Time,Emotion\n";
  const rows = predictions.map(pred => `${pred.time},${pred.emotion}`).reverse().join("\n");
  return headers + rows;
};

function App() {
  const [isCollecting, setIsCollecting] = useState(false);
  const [status, setStatus] = useState('Disconnected');
  const [currentMood, setCurrentMood] = useState('---');
  const [predictions, setPredictions] = useState([]);
  const [view, setView] = useState('mood');
  const ws = useRef(null);

  useEffect(() => {
    function connect() {
      ws.current = new WebSocket(WEBSOCKET_URL);
      ws.current.onopen = () => setStatus('Ready');
      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case 'status': setStatus(message.data); break;
          case 'mood': setCurrentMood(message.data); break;
          case 'prediction_list': setPredictions((prev) => [message.data, ...prev]); break;
        }
      };
      ws.current.onclose = () => {
        setStatus('Disconnected');
        setIsCollecting(false);
        setTimeout(connect, 3000);
      };
      ws.current.onerror = () => {
        setStatus('Disconnected');
        ws.current.close();
      };
    }
    connect();
    return () => { if (ws.current) ws.current.close(); };
  }, []);

  const sendWsCommand = (cmd) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ command: cmd }));
    }
  };

  const handleStart = () => {
    sendWsCommand('start');
    setIsCollecting(true);
    setPredictions([]);
    setCurrentMood('Analyzing');
  };

  const handleStop = () => {
    sendWsCommand('stop');
    if (predictions.length > 0) {
      const csvData = generateCsvContent(predictions);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      link.download = `eeg_session_${timestamp}.csv`;
      link.click();
    }
    setIsCollecting(false);
    setCurrentMood('---');
  };

  const renderView = () => {
    if (view === 'graph') {
      return (
        <div className="glass-panel graph-display">
          <h2>Neural Trend</h2>
          {predictions.length < 2 ? (
            <p className="loading-text">Synchronizing Neural Data...</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={formatChartData(predictions)}>
                <defs>
                  <linearGradient id="colorMood" x1="0" y1="0" x2="0" y2="1">
                    {/* Gold gradient fill */}
                    <stop offset="5%" stopColor="#ffd700" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ffd700" stopOpacity={0} />
                  </linearGradient>
                </defs>
                {/* Axes changed to lavender for light theme visibility */}
                <XAxis dataKey="time" stroke="#bba2be" fontSize={12} tickLine={false} />
                <YAxis domain={[-1.2, 1.2]} ticks={[-1, 0, 1]} stroke="#bba2be" fontSize={12} tickLine={false} />
                <Tooltip
                  // Dark tooltip for contrast, with lavender border
                  contentStyle={{ backgroundColor: '#2d2d2d', border: '1px solid #bba2be', borderRadius: '8px' }}
                  itemStyle={{ color: '#ffd700' }}
                  cursor={{ stroke: '#bba2be', strokeWidth: 1 }}
                />
                <ReferenceLine y={1} stroke="#28a745" strokeDasharray="3 3" />
                <ReferenceLine y={0} stroke="#ffd700" strokeDasharray="3 3" />
                <ReferenceLine y={-1} stroke="#dc3545" strokeDasharray="3 3" />
                <Area
                  type="monotone"
                  dataKey="moodValue"
                  stroke="#ffd700"
                  fillOpacity={1}
                  fill="url(#colorMood)"
                  strokeWidth={3}
                  isAnimationActive={false}
                  // Lavender dots on the line
                  dot={{ fill: '#bba2be', stroke: '#ffd700', strokeWidth: 1, r: 4 }}
                  activeDot={{ r: 6, fill: '#ffd700', stroke: '#bba2be', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      );
    }

    if (view === 'lottie') {
      const url = lottieUrls[currentMood] || lottieUrls['---'];
      return (
        // Lottie display is now centered via CSS
        <div className="glass-panel lottie-display">
          <h2>Mood Visualizer</h2>
          <iframe key={url} src={url} className="lottie-iframe" title="cat"></iframe>
          <p className="lottie-mood-text">{currentMood}</p>
        </div>
      );
    }

    return (
      <div className="main-layout">
        <BrainVisual isActive={isCollecting} currentMood={currentMood} />
        <div className="content-grid">
          <div className="glass-panel mood-display">
            <h2>Current State</h2>
            <div className={`mood-box ${currentMood.toLowerCase()}`} aria-live="polite">
              {currentMood}
            </div>
          </div>
          <div className="glass-panel table-display">
            <h2>Neural Logs</h2>
            {predictions.length === 0 ? <p className="loading-text">No data synced.</p> : (
              <table>
                <thead><tr><th>Timestamp</th><th>State</th></tr></thead>
                <tbody>
                  {predictions.slice(0, 5).map((p, i) => (
                    <tr key={i}><td>{p.time}</td><td>{p.emotion}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <header>
        <h1>NEURAL SYNC</h1>
        <div className="header-accent"></div>
      </header>

      {status === 'Disconnected' && (
        <div className="connect-guide glass-panel">
          <h3>⚠️ Neural Bridge Offline</h3>
          <div className="steps">
            <div className="step"><span>1</span><a href={DOWNLOAD_LINK} target="_blank" rel="noreferrer" className="download-btn">Get Bridge</a></div>
            <div className="step"><span>2</span>Run .bat</div>
            <div className="step"><span>3</span>Sync Headset</div>
          </div>
        </div>
      )}

      <div className={`main-interface ${status === 'Disconnected' ? 'blurred' : ''}`}>
        <div className="controls">
          <button onClick={handleStart} disabled={isCollecting} className="start-button">INITIATE SCAN</button>
          <button onClick={handleStop} disabled={!isCollecting} className="stop-button">TERMINATE</button>
        </div>

        <p className="status-text">System Status: <span className={status.toLowerCase()}>{status}</span></p>

        <div className="view-toggle">
          <button className={view === 'mood' ? 'active' : ''} onClick={() => setView('mood')}>Core</button>
          <button className={view === 'graph' ? 'active' : ''} onClick={() => setView('graph')}>Analytics</button>
          <button className={view === 'lottie' ? 'active' : ''} onClick={() => setView('lottie')}>Visual</button>
        </div>

        <div className="main-content">{renderView()}</div>
      </div>
    </div>
  );
}

export default App;