import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const VideoContext = createContext();

const initialState = {
  videos: [],
  currentVideo: null,
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  }
};

const videoReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_VIDEOS':
      return { 
        ...state, 
        videos: action.payload.videos, 
        pagination: action.payload.pagination,
        loading: false 
      };
    case 'ADD_VIDEO':
      return { 
        ...state, 
        videos: [action.payload, ...state.videos],
        currentVideo: action.payload,
        loading: false 
      };
    case 'UPDATE_VIDEO':
      return {
        ...state,
        videos: state.videos.map(video => 
          video.videoId === action.payload.videoId ? action.payload : video
        ),
        currentVideo: state.currentVideo?.videoId === action.payload.videoId 
          ? action.payload 
          : state.currentVideo
      };
    case 'SET_CURRENT_VIDEO':
      return { ...state, currentVideo: action.payload };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

export const VideoProvider = ({ children }) => {
  const [state, dispatch] = useReducer(videoReducer, initialState);

  const mapStatusToUi = (status) => {
    if (!status) return 'generating';
    const s = String(status).toUpperCase();
    if (s === 'SUCCEEDED' || s === 'COMPLETED' || s === 'COMPLETED_SUCCESS') return 'completed';
    if (s === 'FAILED' || s === 'CANCELLED' || s === 'CANCELED') return 'failed';
    return 'generating';
  };

  const rawBasePath = process.env.NEXT_PUBLIC_API_BASE_PATH || process.env.REACT_APP_API_BASE_PATH || '/ai-video';
  const basePath = rawBasePath.startsWith('/')
    ? rawBasePath.replace(/\/$/, '')
    : `/${rawBasePath.replace(/\/$/, '')}`;
  const api = axios.create({
    baseURL: `${basePath}/api/videos`,
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

  const generateVideo = async (prompt, duration = 5, aspectRatio = '16:9', model = 'gen4_turbo') => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await api.post('/generate', {
        prompt,
        duration,
        aspectRatio,
        model
      });

      const newVideoRaw = response.data.video;
      const newVideo = { ...newVideoRaw, status: mapStatusToUi(newVideoRaw.status) };
      dispatch({ type: 'ADD_VIDEO', payload: newVideo });

      // Show success toast
      toast.success('Video generation started! This may take a few minutes.', {
        duration: 5000,
      });

      // Start polling for status updates
      pollVideoStatus(newVideo.videoId);

      return newVideo;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      
      // Show error toast
      toast.error(`Failed to generate video: ${errorMessage}`);
      throw error;
    }
  };

  const pollVideoStatus = async (videoId, maxAttempts = 60) => {
    let attempts = 0;
    const pollInterval = 3000; // 3 seconds

    const poll = async () => {
      try {
        const response = await api.get(`/${videoId}/status`);
        const videoStatus = { ...response.data, status: mapStatusToUi(response.data.status) };

        dispatch({ type: 'UPDATE_VIDEO', payload: videoStatus });

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

  const fetchVideos = async (page = 1, limit = 10, status = null, search = null) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      if (status) params.append('status', status);
      if (search) params.append('search', search);

      const response = await api.get(`/?${params.toString()}`);
      const videos = (response.data.videos || []).map(v => ({ ...v, status: mapStatusToUi(v.status) }));
      dispatch({ type: 'SET_VIDEOS', payload: { videos, pagination: response.data.pagination } });
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(`Failed to load videos: ${errorMessage}`);
    }
  };

  const updateVideoTitle = async (videoId, title) => {
    try {
      const response = await api.patch(`/${videoId}/title`, { title });
      dispatch({ type: 'UPDATE_VIDEO', payload: response.data.video });
      toast.success('Title updated successfully!');
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      toast.error(`Failed to update title: ${errorMessage}`);
      throw error;
    }
  };

  const regenerateVideo = async (videoId) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'CLEAR_ERROR' });

      const response = await api.post(`/${videoId}/regenerate`);
      const newVideo = response.data.video;
      
      dispatch({ type: 'ADD_VIDEO', payload: newVideo });
      
      toast.success('Regenerating video...', {
        duration: 3000,
      });
      
      pollVideoStatus(newVideo.videoId);

      return newVideo;
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast.error(`Failed to regenerate video: ${errorMessage}`);
      throw error;
    }
  };

  const deleteVideo = async (videoId) => {
    try {
      await api.delete(`/${videoId}`);
      dispatch({ 
        type: 'SET_VIDEOS', 
        payload: {
          videos: state.videos.filter(video => video.videoId !== videoId),
          pagination: state.pagination
        }
      });
      toast.success('Video deleted successfully!');
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message;
      toast.error(`Failed to delete video: ${errorMessage}`);
      throw error;
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const value = {
    ...state,
    generateVideo,
    fetchVideos,
    updateVideoTitle,
    regenerateVideo,
    deleteVideo,
    clearError
  };

  return (
    <VideoContext.Provider value={value}>
      {children}
    </VideoContext.Provider>
  );
};

export const useVideo = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
};
