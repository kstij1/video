import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ChatContext = createContext();

const initialState = {
  messages: [],
  currentVideo: null,
  threadId: null,
  threads: [],
  isGenerating: false,
  error: null
};

const chatReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isGenerating: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isGenerating: false };
    case 'ADD_MESSAGE':
      return { 
        ...state, 
        messages: [...state.messages, action.payload],
        isGenerating: false 
      };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.id ? { ...msg, ...action.payload.updates } : msg
        )
      };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'SET_CURRENT_VIDEO':
      return { ...state, currentVideo: action.payload };
    case 'SET_THREAD_ID':
      return { ...state, threadId: action.payload };
    case 'SET_THREADS':
      return { ...state, threads: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

export const ChatProvider = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Local storage keys for persistence
  const STORAGE_KEYS = {
    MESSAGES: 'vg_chat_messages',
    CURRENT_VIDEO: 'vg_current_video',
    THREAD_ID: 'vg_chat_thread_id'
  };

  // Load persisted chat on first mount
  useEffect(() => {
    // Always start a fresh chat on reload
    try {
      localStorage.removeItem(STORAGE_KEYS.MESSAGES);
      localStorage.removeItem(STORAGE_KEYS.CURRENT_VIDEO);
      localStorage.removeItem(STORAGE_KEYS.THREAD_ID);
    } catch (_) {}
    dispatch({ type: 'SET_MESSAGES', payload: [] });
    dispatch({ type: 'SET_CURRENT_VIDEO', payload: null });
    dispatch({ type: 'SET_THREAD_ID', payload: null });
  }, []);

  // Persist whenever messages or currentVideo change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(state.messages));
      if (state.currentVideo) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_VIDEO, JSON.stringify(state.currentVideo));
      }
      if (state.threadId) {
        localStorage.setItem(STORAGE_KEYS.THREAD_ID, state.threadId);
      }
    } catch (_) {}
  }, [state.messages, state.currentVideo, state.threadId]);

  const rawBasePath = process.env.NEXT_PUBLIC_API_BASE_PATH || process.env.REACT_APP_API_BASE_PATH || '/ai-video';
  const basePath = rawBasePath.startsWith('/')
    ? rawBasePath.replace(/\/$/, '')
    : `/${rawBasePath.replace(/\/$/, '')}`;
  const api = axios.create({
    baseURL: `${basePath}/api/chat`,
    headers: {
      'Content-Type': 'application/json'
    },
    withCredentials: true
  });

  // Redirect unauthenticated users to Weam login
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      // If unauthenticated, do not redirect; let callers handle the error
      if (status === 401) {
        return Promise.reject(error);
      }
      return Promise.reject(error);
    }
  );

  const sendMessage = async (message, chatHistory = [], opts = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      // Add user message immediately
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: message,
        timestamp: new Date()
      };
      dispatch({ type: 'ADD_MESSAGE', payload: userMessage });

      // Send to intelligent chat API
      const response = await api.post('/', {
        message,
        chatHistory: chatHistory.map(msg => ({
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        currentVideo: state.currentVideo,
        // pass UI selections
        quality: opts.quality,
        duration: opts.duration,
        aspectRatio: opts.aspectRatio,
        threadId: state.threadId
      });

      const aiResponse = {
        // Use videoId as the message id so polling updates this same message
        id: response.data.videoId || (Date.now() + 1),
        type: response.data.type || 'conversation',
        content: response.data.content,
        timestamp: new Date(),
        intent: response.data.intent,
        confidence: response.data.confidence,
        videoId: response.data.videoId,
        status: response.data.status,
        enhancedPrompt: response.data.enhancedPrompt,
        originalPrompt: response.data.originalPrompt,
        model: response.data.model,
        isEnhancement: response.data.type === 'video_enhancement'
      };

      if (response.data.threadId && response.data.threadId !== state.threadId) {
        dispatch({ type: 'SET_THREAD_ID', payload: response.data.threadId });
      }

      dispatch({ type: 'ADD_MESSAGE', payload: aiResponse });

      // If it's a video generation/enhancement, start polling
      if (response.data.videoId) {
        pollVideoStatus(response.data.videoId);
      }

      return aiResponse;

    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      
      // Add error message to chat
      const errorResponse = {
        id: Date.now() + 1,
        type: 'error',
        content: `Sorry, I encountered an error: ${errorMessage}`,
        timestamp: new Date(),
        isError: true
      };
      dispatch({ type: 'ADD_MESSAGE', payload: errorResponse });
      
      toast.error(`Chat error: ${errorMessage}`);
      throw error;
    }
  };

  const pollVideoStatus = async (videoId, maxAttempts = 60) => {
    let attempts = 0;
    const pollInterval = 3000; // 3 seconds

    const poll = async () => {
      try {
        const response = await api.get(`/video/${videoId}/status`);
        const videoStatus = response.data;

        // Update the message with video status
        dispatch({ 
          type: 'UPDATE_MESSAGE', 
          payload: {
            id: videoId, // Use videoId as the message identifier
            updates: {
              status: videoStatus.status,
              videoUrl: videoStatus.videoUrl,
              progress: videoStatus.progress,
              errorMessage: videoStatus.errorMessage,
              enhancedPrompt: videoStatus.enhancedPrompt,
              originalPrompt: videoStatus.originalPrompt,
              model: videoStatus.model
            }
          }
        });

        if (videoStatus.status === 'completed') {
          toast.success('🎉 Your video is ready!', {
            duration: 6000,
          });
          return;
        }

        if (videoStatus.status === 'failed') {
          toast.error(`Video generation failed: ${videoStatus.errorMessage || 'Unknown error'}`, {
            duration: 8000,
          });
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval);
        } else {
          toast.error('Video generation timed out. Please try again.', {
            duration: 8000,
          });
        }
      } catch (error) {
        console.error('Error polling video status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, pollInterval);
        } else {
          toast.error('Lost connection to video generation. Please refresh the page.', {
            duration: 8000,
          });
        }
      }
    };

    poll();
  };

  const fetchThreads = async () => {
    try {
      const res = await api.get('/threads');
      dispatch({ type: 'SET_THREADS', payload: res.data.threads || [] });
    } catch (e) {
      console.error('Failed to fetch threads', e);
    }
  };

  const openThread = async (threadId) => {
    try {
      const res = await api.get(`/threads/${threadId}`);
      const thread = res.data;
      const revived = (thread.messages || []).map(m => ({
        ...m,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
      }));
      dispatch({ type: 'SET_MESSAGES', payload: revived });
      dispatch({ type: 'SET_THREAD_ID', payload: thread.threadId });
      // If thread is linked to a video, set it as currentVideo skeleton
      if (thread.videoId) {
        dispatch({ type: 'SET_CURRENT_VIDEO', payload: { videoId: thread.videoId } });
      }
    } catch (e) {
      console.error('Failed to open thread', e);
    }
  };

  const startNewThread = () => {
    dispatch({ type: 'SET_MESSAGES', payload: [] });
    dispatch({ type: 'SET_CURRENT_VIDEO', payload: null });
    dispatch({ type: 'SET_THREAD_ID', payload: null });
    // Also create an empty server-side thread so it appears in history immediately
    (async () => {
      try {
        const res = await api.post('/threads', { title: 'New chat' });
        await fetchThreads();
        if (res.data?.threadId) {
          dispatch({ type: 'SET_THREAD_ID', payload: res.data.threadId });
        }
      } catch (e) {
        // Ignore creating empty thread failures silently
      }
    })();
  };

  const clearMessages = () => {
    dispatch({ type: 'SET_MESSAGES', payload: [] });
  };

  const setCurrentVideo = (video) => {
    dispatch({ type: 'SET_CURRENT_VIDEO', payload: video });
  };

  const openChatForVideo = (video) => {
    // If switching to a different video, seed an initial assistant message
    if (!state.currentVideo || state.currentVideo.videoId !== video.videoId) {
      const seed = [
        {
          id: Date.now(),
          type: 'ai',
          content: `Here's your video: "${video.title || 'Untitled Video'}". You can ask me to enhance it, modify it, or create variations. What would you like to do?`,
          timestamp: new Date(),
          videoUrl: video.videoUrl,
          videoId: video.videoId,
          status: video.status
        }
      ];
      dispatch({ type: 'SET_MESSAGES', payload: seed });
    }
    dispatch({ type: 'SET_CURRENT_VIDEO', payload: video });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value = {
    ...state,
    sendMessage,
    fetchThreads,
    openThread,
    startNewThread,
    clearMessages,
    setCurrentVideo,
    openChatForVideo,
    clearError
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
