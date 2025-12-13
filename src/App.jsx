import { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import './App.css';

// --- CONFIGURATION ---
// ⚠️ IMPORTANT: Replace this link with your actual Google Drive share link!
const DOWNLOAD_LINK = "https://drive.google.com/file/d/1e2_2ZXsQqEG4T0XnabQu0shKJqgk7ASw/view?usp=sharing"; 

// This tells the Vercel site to look for the bridge on the user's computer
const WEBSOCKET_URL = 'ws://localhost:8000/ws';

// --- Lottie Animation URLs (Embed Mode) ---
const lottieUrls = {
  POSITIVE: 'https://lottie.host/embed/89eecf10-004f-49d4-81ad-bb3c058f8215/OjEH4ixGXY.lottie',
  NEUTRAL: 'https://lottie.host/embed/10619131-93d1-470e-b8b7-7c2bbb87aa84/FX54B98OTA.lottie',
  NEGATIVE: 'https://lottie.host/embed/ace77aff-70a6-43ef-979c-abad404699c3/QnVjTw4Jod.lottie',
  Analyzing: 'https://lottie.host/embed/10619131-93d1-470e-b8b7-7c2bbb87aa84/FX54B98OTA.lottie',
  '---': 'https://lottie.host/embed/10619131-93d1-470e-b8b7-7c2bbb87aa84/FX54B98OTA.lottie',
};

// --- Helper: Format Chart Data ---
const formatChartData = (predictions) => {
  const moodToNumber = { POSITIVE: 1, NEUTRAL: 0, NEGATIVE: -1 };
  return predictions.map((pred) => ({
    time: pred.time,
    moodValue: moodToNumber[pred.emotion],
    mood: pred.emotion,
  })).reverse();
};

// --- Helper: Generate CSV Content ---
const generateCsvContent = (predictions) => {
  const headers = "Time,Emotion\n";
  // Reverse the array to get chronological order (oldest first)
  const rows = predictions
    .map(pred => `${pred.time},${pred.emotion}`)
    .reverse()
    .join("\n");
  return headers + rows;
};

// --- Main App Component ---
function App() {
  // --- React State ---
  const [isCollecting, setIsCollecting] = useState(false);
  const [status, setStatus] = useState('Disconnected'); // Default to Disconnected to show guide
  const [currentMood, setCurrentMood] = useState('---');
  const [predictions, setPredictions] = useState([]);
  const [view, setView] = useState('mood');

  const ws = useRef(null);

  // --- WebSocket Connection ---
  useEffect(() => {
    function connect() {
      // Create WebSocket connection
      ws.current = new WebSocket(WEBSOCKET_URL);

      ws.current.onopen = () => {
        console.log('WebSocket Connected');
        setStatus('Ready'); // Connected state hides the guide
      };

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case 'status': 
            setStatus(message.data); 
            break;
          case 'mood': 
            setCurrentMood(message.data); 
            break;
          case 'prediction_list': 
            setPredictions((prev) => [message.data, ...prev]); 
            break;
        }
      };

      ws.current.onclose = () => {
        console.log('WS Closed');
        setStatus('Disconnected'); // Disconnected state shows the guide
        setIsCollecting(false);
        // Try to reconnect every 3 seconds
        setTimeout(connect, 3000); 
      };

      ws.current.onerror = () => {
        setStatus('Disconnected');
        ws.current.close();
      };
    }

    // Initial connection
    connect();

    // Cleanup on unmount
    return () => {
      if (ws.current) ws.current.close();
    };
  }, []);

  // --- Handlers ---
  const sendWsCommand = (cmd) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ command: cmd }));
    }
  };

  const handleStart = () => {
    console.log('Start button clicked');
    sendWsCommand('start');
    setIsCollecting(true);
    setPredictions([]);
    setCurrentMood('Analyzing');
  };

  const handleStop = () => {
    console.log('Stop button clicked');
    sendWsCommand('stop');

    // --- CSV Download Logic ---
    if (predictions.length > 0) {
      console.log('Generating CSV download...');
      const csvData = generateCsvContent(predictions);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      
      // Filename with timestamp
      const timestamp = new Date().toISOString().slice(0,19).replace(/:/g,'-');
      link.download = `eeg_session_${timestamp}.csv`;
      
      link.click();
    }

    setIsCollecting(false);
    setCurrentMood('---');
  };

  // --- View Rendering Logic ---
  const renderView = () => {
    // 1. Graph View
    if (view === 'graph') {
      return (
        <div className="graph-display">
          <h2>Mood Trend</h2>
          {predictions.length < 2 ? (
            <p>Waiting for more data (need at least 2 points)...</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={formatChartData(predictions)}>
                <XAxis dataKey="time" />
                <YAxis domain={[-1.2, 1.2]} ticks={[-1, 0, 1]} />
                <Tooltip 
                  contentStyle={{backgroundColor:'#222', border:'none', borderRadius:'8px'}} 
                  itemStyle={{color:'#fff'}}
                />
                <ReferenceLine y={1} stroke="#28a745" strokeDasharray="3 3" label="Pos" />
                <ReferenceLine y={0} stroke="#ffc107" strokeDasharray="3 3" label="Neu" />
                <ReferenceLine y={-1} stroke="#dc3545" strokeDasharray="3 3" label="Neg" />
                <Line 
                  type="monotone" 
                  dataKey="moodValue" 
                  stroke="#8884d8" 
                  strokeWidth={3} 
                  dot={false} 
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      );
    }

    // 2. Lottie (Cat) View
    if (view === 'lottie') {
      const url = lottieUrls[currentMood] || lottieUrls['---'];
      return (
        <div className="lottie-display">
          <h2>Current Mood Cat</h2>
          <iframe 
            key={url} // Force reload on URL change
            src={url} 
            className="lottie-iframe" 
            title="cat"
          ></iframe>
          <p className="lottie-mood-text">{currentMood}</p>
        </div>
      );
    }

    // 3. Default Mood & Table View
    return (
      <div className="content-grid">
        <div className="mood-display">
          <h2>Current Mood</h2>
          <div className={`mood-box ${currentMood.toLowerCase()}`} aria-live="polite">
            {currentMood}
          </div>
        </div>
        <div className="table-display">
          <h2>Recent Predictions</h2>
          {predictions.length === 0 ? <p>No data yet.</p> : (
            <table>
              <thead><tr><th>Time</th><th>Emotion</th></tr></thead>
              <tbody>
                {predictions.slice(0, 5).map((p, i) => (
                  <tr key={i}><td>{p.time}</td><td>{p.emotion}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="App">
      <header><h1>🧠 Live EEG Mood Prediction</h1></header>

      {/* --- Connection Guide (Only visible when Disconnected) --- */}
      {status === 'Disconnected' && (
        <div className="connect-guide">
          <h3>⚠️ Bridge Not Detected</h3>
          <p>To use this app, you must run the local bridge software.</p>
          <div className="steps">
            <div className="step">
              <span>1</span>
              <a href={DOWNLOAD_LINK} target="_blank" rel="noreferrer" className="download-btn">
                Download Bridge App ⬇️
              </a>
            </div>
            <div className="step"><span>2</span> Unzip & Run <b>Start_Bridge.bat</b></div>
            <div className="step"><span>3</span> Connect Headset</div>
          </div>
          <p className="waiting-text">Waiting for connection on localhost:8000...</p>
        </div>
      )}

      {/* --- Main Interface (Blurred when disconnected) --- */}
      <div className={`main-interface ${status === 'Disconnected' ? 'blurred' : ''}`}>
        
        {/* Controls */}
        <div className="controls">
          <button onClick={handleStart} disabled={isCollecting} className="start-button">Start 🚀</button>
          <button onClick={handleStop} disabled={!isCollecting} className="stop-button">Stop 🛑</button>
        </div>

        {/* Status Bar */}
        <p className="status">Status: <span>{status}</span></p>

        {/* View Toggle */}
        <div className="view-toggle">
          <button className={`toggle-btn ${view === 'mood' ? 'active' : ''}`} onClick={() => setView('mood')}>Mood</button>
          <button className={`toggle-btn ${view === 'graph' ? 'active' : ''}`} onClick={() => setView('graph')}>Graph</button>
          <button className={`toggle-btn ${view === 'lottie' ? 'active' : ''}`} onClick={() => setView('lottie')}>Cat</button>
        </div>

        {/* Dynamic Content */}
        <div className="main-content">{renderView()}</div>
      </div>
    </div>
  );
}

export default App;