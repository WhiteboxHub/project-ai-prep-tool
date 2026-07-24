import '@testing-library/jest-dom';

// Polyfill window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // Deprecated
    removeListener: () => {}, // Deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Polyfill ResizeObserver
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as any;
(window as any).ResizeObserver = MockResizeObserver;

// Polyfill MediaRecorder
class MockMediaRecorder {
  state: string = 'inactive';
  stream: any;
  onstart: ((...args: any[]) => void) | null = null;
  onstop: ((...args: any[]) => void) | null = null;
  ondataavailable: ((...args: any[]) => void) | null = null;
  onerror: ((...args: any[]) => void) | null = null;

  constructor(stream: any, options?: any) {
    this.stream = stream;
  }

  start() {
    this.state = 'recording';
    if (this.onstart) this.onstart(new Event('start'));
  }

  stop() {
    this.state = 'inactive';
    if (this.ondataavailable) {
      this.ondataavailable(new MessageEvent('dataavailable', { data: new Blob() }));
    }
    if (this.onstop) this.onstop(new Event('stop'));
  }

  pause() {
    this.state = 'paused';
  }

  resume() {
    this.state = 'recording';
  }

  requestData() {}

  static isTypeSupported(mimeType: string) {
    return true;
  }
}

Object.defineProperty(window, 'MediaRecorder', {
  writable: true,
  value: MockMediaRecorder,
});
(global as any).MediaRecorder = MockMediaRecorder;

// Polyfill navigator.mediaDevices
if (!navigator.mediaDevices) {
  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {},
  });
}

Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
  writable: true,
  value: async () => {
    return {
      getTracks: () => [],
      getAudioTracks: () => [],
      getVideoTracks: () => [],
      addTrack: () => {},
      removeTrack: () => {},
      clone: () => ({}),
      stop: () => {},
    };
  },
});

Object.defineProperty(navigator.mediaDevices, 'enumerateDevices', {
  writable: true,
  value: async () => [],
});

// Polyfill IntersectionObserver
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver = MockIntersectionObserver as any;
(window as any).IntersectionObserver = MockIntersectionObserver;

// Polyfill SpeechSynthesis
class MockSpeechSynthesisUtterance {
  text: string;
  rate = 1;
  pitch = 1;
  onstart = () => {};
  onend = () => {};
  onerror = () => {};
  constructor(text: string = '') {
    this.text = text;
  }
}
(window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
global.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance as any;

if (!('speechSynthesis' in window)) {
  Object.defineProperty(window, 'speechSynthesis', {
    writable: true,
    value: {
      speak: (utt: any) => {
        if (utt && typeof utt.onstart === 'function') setTimeout(() => utt.onstart(), 0);
        if (utt && typeof utt.onend === 'function') setTimeout(() => utt.onend(), 10);
      },
      cancel: () => {},
      pause: () => {},
      resume: () => {},
      getVoices: () => [],
    },
  });
}

// Polyfill SpeechRecognition
class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  onstart = () => {};
  onresult = () => {};
  onerror = () => {};
  onend = () => {};
  start() {
    if (this.onstart) this.onstart();
  }
  stop() {
    if (this.onend) this.onend();
  }
}
(window as any).SpeechRecognition = MockSpeechRecognition;
(window as any).webkitSpeechRecognition = MockSpeechRecognition;

