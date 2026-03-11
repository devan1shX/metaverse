import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Code2, Terminal, Minimize2, Maximize2, LogOut, Users, AlertTriangle, X } from 'lucide-react';

interface SessionParticipant {
  id: string;
  user_name: string;
}

interface CodeEditorProps {
  spaceId: string;
  userId: string;
  userName: string;
  onClose: () => void;
  sessionParticipants?: SessionParticipant[]; // Who else is in this session
  initialCode?: string;
  initialLanguage?: string;
  onCodeChange?: (code: string, language: string) => void;
  onRunCode?: (code: string, language: string) => void;
  executionResult?: { output: string; error: string; isRunning: boolean } | null;
}

const SUPPORTED_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', defaultCode: 'console.log("Hello from JavaScript");' },
  { id: 'python', name: 'Python', defaultCode: 'print("Hello from Python")' },
  { id: 'cpp', name: 'C++', defaultCode: '#include <iostream>\n\nint main() {\n    std::cout << "Hello from C++";\n    return 0;\n}' },
  { id: 'java', name: 'Java', defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java");\n    }\n}' },
];

/** Small inline confirmation dialog rendered inside the editor header */
function LeaveConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="modal-shell w-80 p-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--danger-soft)]">
          <AlertTriangle className="h-6 w-6 text-[var(--danger)]" />
        </div>
        <div className="text-center">
          <h3 className="mb-1 text-base font-semibold text-[var(--text-primary)]">Leave Code Session?</h3>
          <p className="text-sm text-[var(--text-muted)]">
            Your collaborators will stay in the session. You can rejoin by accepting a new invite.
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="btn-secondary flex-1"
          >
            <X className="w-4 h-4" />
            Stay
          </button>
          <button
            onClick={onConfirm}
            className="btn-danger flex-1"
          >
            <LogOut className="w-4 h-4" />
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}

export function CodeEditor({
  spaceId,
  userId,
  userName,
  onClose,
  sessionParticipants = [],
  initialCode = '',
  initialLanguage = 'javascript',
  onCodeChange,
  onRunCode,
  executionResult
}: CodeEditorProps) {
  const [language, setLanguage] = useState(initialLanguage);
  const [code, setCode] = useState(initialCode || SUPPORTED_LANGUAGES.find(l => l.id === initialLanguage)?.defaultCode || '');
  const [isOutputExpanded, setIsOutputExpanded] = useState(true);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const editorRef = useRef<any>(null);

  // Update local state if props change (e.g., from websocket)
  useEffect(() => {
    if (initialCode !== undefined && initialCode !== code) {
      setCode(initialCode);
    }
  }, [initialCode]);

  useEffect(() => {
    if (initialLanguage !== undefined && initialLanguage !== language) {
      setLanguage(initialLanguage);
    }
  }, [initialLanguage]);

  const handleEditorChange = (value: string | undefined) => {
    const newCode = value || '';
    setCode(newCode);
    if (onCodeChange) {
      onCodeChange(newCode, language);
    }
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    
    const isCurrentTemplate = SUPPORTED_LANGUAGES.some(l => l.defaultCode === code) || code === '';
    if (isCurrentTemplate) {
      const newTemplate = SUPPORTED_LANGUAGES.find(l => l.id === newLang)?.defaultCode || '';
      setCode(newTemplate);
      if (onCodeChange) onCodeChange(newTemplate, newLang);
    } else {
        if (onCodeChange) onCodeChange(code, newLang);
    }
  };

  const handleRun = () => {
    if (onRunCode) {
      onRunCode(code, language);
      setIsOutputExpanded(true);
    }
  };

  // All participants shown = yourself + session participants
  const allParticipants = [
    { id: userId, user_name: userName + ' (You)' },
    ...sessionParticipants.filter(p => p.id !== userId),
  ];

  return (
    <div className="glass-panel relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-[var(--border-default)] pointer-events-auto">
      
      {/* Leave Confirmation Overlay */}
      {showLeaveConfirm && (
        <LeaveConfirmDialog
          onConfirm={() => {
            setShowLeaveConfirm(false);
            onClose();
          }}
          onCancel={() => setShowLeaveConfirm(false)}
        />
      )}

      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--border-default)] bg-[rgba(18,24,34,0.84)] px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <Code2 className="h-5 w-5 text-[var(--accent-strong)]" />
            <span className="text-sm font-semibold text-[var(--text-primary)]">Collaborative Editor</span>
          </div>
          
          <div className="mx-1 h-4 w-px bg-[var(--border-default)]"></div>
          
          <select
            value={language}
            onChange={handleLanguageChange}
            className="rounded-full border border-[var(--border-default)] bg-white/5 px-3 py-1.5 text-sm text-[var(--text-secondary)] outline-none transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.id} value={lang.id}>
                {lang.name}
              </option>
            ))}
          </select>
          
          <div className="mx-1 h-4 w-px bg-[var(--border-default)]"></div>

          {/* Session Participants Button */}
          <div className="relative">
            <button
              onClick={() => setShowParticipants(p => !p)}
              title="Session participants"
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                showParticipants ? "border-[rgba(239,188,130,0.24)] bg-[rgba(215,163,102,0.12)] text-[var(--accent-strong)]" : "border-[var(--border-default)] bg-white/5 text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{allParticipants.length}</span>
            </button>

            {/* Participants Dropdown */}
            {showParticipants && (
              <div className="glass-panel absolute left-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-[20px]">
                <div className="border-b border-[var(--border-default)] px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-soft)]">In This Session</span>
                </div>
                <div className="py-1 max-h-48 overflow-y-auto">
                  {allParticipants.map(p => (
                    <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-white/5">
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(215,163,102,0.18)] text-xs font-bold text-[var(--accent-strong)]">
                        {p.user_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate text-sm text-[var(--text-secondary)]">{p.user_name}</span>
                      {p.id === userId && (
                        <span className="ml-auto text-xs font-medium text-[var(--accent-strong)]">You</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
            <button
              onClick={handleRun}
              disabled={executionResult?.isRunning}
              className={`inline-flex min-h-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  executionResult?.isRunning 
                  ? 'cursor-not-allowed border border-[var(--border-default)] bg-white/5 text-[var(--text-soft)]'
                  : 'btn-primary'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              {executionResult?.isRunning ? 'Running...' : 'Run Code'}
            </button>

            {/* Leave Session Button */}
            <button 
                onClick={() => setShowLeaveConfirm(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(239,124,120,0.24)] bg-[var(--danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--danger)] transition-colors hover:brightness-110"
                title="Leave Code Session"
            >
                <LogOut className="w-4 h-4" />
                <span>Leave</span>
            </button>
        </div>
      </div>

      {/* Online indicator strip */}
      <div className="flex items-center gap-2 border-b border-[var(--border-default)] bg-[rgba(10,14,22,0.58)] px-4 py-2">
        {allParticipants.map(p => (
          <div key={p.id} className="flex items-center gap-1.5" title={p.user_name}>
            <div className="relative">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(215,163,102,0.18)] text-[10px] font-bold text-[var(--accent-strong)]">
                {p.user_name.charAt(0).toUpperCase()}
              </div>
              <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-[rgba(10,14,22,0.8)] bg-[var(--success)]"></div>
            </div>
          </div>
        ))}
        <span className="ml-1 text-[11px] text-[var(--text-soft)]">
          {allParticipants.length === 1
            ? 'Only you are in this session'
            : `${allParticipants.length} collaborators active`}
        </span>
      </div>

      {/* Main Editor Area */}
      <div className="relative min-h-0 flex-1 bg-[#0d131d]" onClick={() => setShowParticipants(false)}>
        <Editor
          height="100%"
          language={language}
          theme="vs-dark"
          value={code}
          onChange={handleEditorChange}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            padding: { top: 16 },
            fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
          }}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
        />
      </div>

      {/* Output / Terminal Panel */}
      <div className={`flex flex-col border-t border-[var(--border-default)] bg-[rgba(10,14,22,0.88)] transition-all duration-300 ease-[var(--ease-spring)] ${isOutputExpanded ? 'h-1/3 min-h-[150px]' : 'h-10'}`}>
        
        {/* Output Header */}
        <div 
            className="flex h-10 flex-shrink-0 items-center justify-between px-4 transition-colors hover:bg-white/5 cursor-pointer"
            onClick={() => setIsOutputExpanded(!isOutputExpanded)}
        >
            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Terminal className="w-4 h-4" />
                <span className="font-semibold text-[var(--text-primary)]">Execution Output</span>
            </div>
            <button className="p-1 text-[var(--text-soft)] hover:text-[var(--text-primary)]">
                {isOutputExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
        </div>

        {/* Output Content */}
        {isOutputExpanded && (
            <div className="flex-1 overflow-y-auto bg-[#0d131d] p-4 font-mono text-sm">
                {executionResult?.isRunning ? (
                    <div className="animate-pulse text-[var(--text-muted)]">Running...</div>
                ) : !executionResult ? (
                    <div className="italic text-[var(--text-soft)]">Click 'Run Code' to see output here.</div>
                ) : (
                    <>
                        {executionResult.error && (
                            <div className="mb-2 whitespace-pre-wrap text-[var(--danger)]">
                                {executionResult.error}
                            </div>
                        )}
                        {executionResult.output && (
                            <div className="whitespace-pre-wrap text-[var(--text-secondary)]">
                                {executionResult.output}
                            </div>
                        )}
                        {!executionResult.error && !executionResult.output && (
                            <div className="italic text-[var(--text-soft)]">Program executed with no output.</div>
                        )}
                    </>
                )}
            </div>
        )}
      </div>
    </div>
  );
}
