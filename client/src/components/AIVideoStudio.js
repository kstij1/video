import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideo } from '../context/VideoContext';
import { useChat } from '../context/ChatContext';
import { 
  Search, 
  Play, 
  Clock, 
  Sparkles,
  Send,
  Paperclip,
  ChevronDown,
  Star,
  Heart,
  X,
  Video,
  MessageSquare,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import VideoPlayer from './VideoPlayer';
import { Link } from 'react-router-dom';
import { Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';

const AIVideoStudio = () => {
  const { videos, fetchVideos } = useVideo();
  const { messages, sendMessage, isGenerating, setCurrentVideo, openChatForVideo, fetchThreads, openThread, threads, startNewThread } = useChat();
  const [searchTerm, setSearchTerm] = useState('');
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('Runway Gen-4 Turbo');
  const [providerAvailability, setProviderAvailability] = useState({ runway: false, banana: false, veo3: false });
  const [quality, setQuality] = useState('1080p');
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [selectedVideo, setSelectedVideo] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchVideos();
    fetchThreads();
  }, []);

  useEffect(() => {
    // Fetch provider availability once on mount
    (async () => {
      try {
        const rawBasePath = process.env.NEXT_PUBLIC_API_BASE_PATH || process.env.REACT_APP_API_BASE_PATH || '/ai-video';
        const basePath = rawBasePath.startsWith('/') ? rawBasePath.replace(/\/$/, '') : `/${rawBasePath.replace(/\/$/, '')}`;
        const res = await fetch(`${basePath}/api/videos/providers`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setProviderAvailability(data || {});
          // If current selection isn't available, pick the first available
          const keyFor = (label) => label === 'Runway Gen-4 Turbo' ? 'runway' : label === 'Banana' ? 'banana' : 'veo3';
          if (!data[keyFor(selectedModel)]) {
            const order = [
              { label: 'Runway Gen-4 Turbo', key: 'runway' },
              { label: 'Banana', key: 'banana' },
              { label: 'Veo3', key: 'veo3' }
            ];
            const first = order.find(o => data[o.key]);
            if (first) setSelectedModel(first.label);
          }
        }
      } catch (_) {}
    })();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Function to detect if the prompt is asking to enhance/modify an existing video
  const isEnhancementPrompt = (prompt) => {
    const enhancementKeywords = [
      'enhance', 'improve', 'modify', 'change', 'add', 'remove', 'make it', 
      'make the', 'update', 'edit', 'adjust', 'fix', 'better', 'more',
      'less', 'brighter', 'darker', 'faster', 'slower', 'longer', 'shorter'
    ];
    
    const lowerPrompt = prompt.toLowerCase();
    return enhancementKeywords.some(keyword => lowerPrompt.includes(keyword));
  };

  // Function to get the most recent video from chat messages
  const getLatestVideoFromChat = () => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.videoUrl && message.videoId && message.status === 'completed') {
        return {
          videoId: message.videoId,
          videoUrl: message.videoUrl,
          prompt: message.originalPrompt || 'previous video'
        };
      }
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    const currentPrompt = prompt;
    setPrompt('');

    try {
      // Send message to intelligent chat API
      await sendMessage(currentPrompt, messages, {
        quality,
        duration,
        aspectRatio,
        model: selectedModel
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };


  const handleVideoClick = (video) => {
    setSelectedVideo(video);
    openChatForVideo(video);
  };


  const startNewChat = () => {
    setSelectedVideo(null);
    setCurrentVideo(null);
    // The chat context will handle clearing messages
  };

  const filteredVideos = videos.filter(video =>
    (video.title && video.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (video.prompt && video.prompt.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="h-screen bg-gradient-to-br from-purple-50/20 via-white to-white flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-md border-b border-gray-200 px-6 py-4 flex items-center justify-between"
      >
        <div className="flex items-center space-x-3">
          <img src="/weam-logo.svg" alt="Weam AI" className="h-8 w-auto" />
          <span className="text-lg font-semibold text-gray-900">Weam AI</span>
          <a
            href={(process.env.REACT_APP_WEAM_APP_URL || 'https://app.weam.ai')}
            className="ml-3 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50 text-sm"
          >
            ← Back to App
          </a>
        </div>

        {/* Model Selector and Right side text */}
        <div className="flex items-center space-x-4">
          {/* Model Selection */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Model:</span>
            <div className="relative">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="Runway Gen-4 Turbo" disabled={!providerAvailability.runway}>{providerAvailability.runway ? '🟢 ' : '🔴 '}Runway Gen-4 Turbo</option>
                <option value="Banana" disabled={!providerAvailability.banana}>{providerAvailability.banana ? '🟢 ' : '🔴 '}Banana</option>
                <option value="Veo3" disabled={!providerAvailability.veo3}>{providerAvailability.veo3 ? '🟢 ' : '🔴 '}Veo3</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          {/* Removed tagline */}
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Video Library */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-80 bg-white/60 backdrop-blur-sm border-r border-gray-200 flex flex-col"
        >
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Video Library</h2>
              <button
                onClick={() => {
                  startNewThread();
                }}
                className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                title="Start New Chat"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </div>

          {/* Video List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {/* Threads header */}
            <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Chats</div>
            {threads.length === 0 && (
              <div className="text-gray-400 text-sm mb-4">No chats yet</div>
            )}
            {threads.map((t) => (
              <motion.div
                key={t.threadId}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => openThread(t.threadId)}
                className="p-3 rounded-lg border bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-gray-900 truncate">{t.title || `Thread ${t.threadId.slice(0, 6)}`}</div>
                  <div className="text-xs text-gray-400">{new Date(t.updatedAt).toLocaleDateString()}</div>
                </div>
                <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {(t.messages && t.messages.length > 0) ? t.messages[t.messages.length - 1].content : 'Empty chat'}
                </div>
              </motion.div>
            ))}

            {/* Videos header */}
            <div className="text-xs uppercase tracking-wide text-gray-500 mt-6 mb-2">Videos</div>
            {filteredVideos.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Video className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No videos found</p>
              </div>
            ) : (
              filteredVideos.map((video) => (
                <motion.div
                  key={video.videoId}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVideoClick(video)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedVideo?.videoId === video.videoId
                      ? 'bg-primary-50 border-primary-200 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                      {video.status === 'completed' ? (
                        <Play className="h-4 w-4 text-gray-600" />
                      ) : video.status === 'generating' ? (
                        <Loader2 className="h-4 w-4 text-primary-500 animate-spin" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {video.title || 'Untitled Video'}
                      </h3>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {video.prompt || 'No prompt available'}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span className="text-xs text-gray-400">
                          {video.createdAt ? new Date(video.createdAt).toLocaleDateString() : 'Unknown date'}
                        </span>
                        {video.duration && (
                          <span className="text-xs text-gray-400 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {video.duration}s
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="flex justify-center items-center h-full">
                <div className="text-center text-gray-500">
                  <Star className="h-12 w-12 mx-auto mb-4 text-primary-300" />
                  <h3 className="text-lg font-medium mb-2">Welcome to AI Video Studio!</h3>
                  <p className="text-sm">I can help you create amazing videos. Just describe what you want to see and I'll generate it for you.</p>
                  <p className="text-sm mt-2">After creating a video, you can enhance it by saying things like "make it brighter", "add more colors", or "enhance the video".</p>
                </div>
              </div>
            )}
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-2xl ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                  <div className={`flex items-start space-x-3 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.type === 'user' 
                        ? 'bg-primary-500' 
                        : 'bg-gradient-to-br from-primary-500 to-primary-600'
                    }`}>
                      {message.type === 'user' ? (
                        <span className="text-white text-sm font-medium">U</span>
                      ) : (
                        <Star className="h-4 w-4 text-white" />
                      )}
                    </div>

                    {/* Message Content */}
                    <div className={`rounded-2xl px-4 py-3 ${
                      message.type === 'user'
                        ? 'bg-primary-500 text-white'
                        : message.isError
                        ? 'bg-red-50 text-red-800 border border-red-200'
                        : 'bg-white border border-gray-200 shadow-sm'
                    }`}>
                      <p className="text-sm">{message.content}</p>
                      
                      {/* Video Content */}
                      {message.videoUrl && (
                        <div className="mt-3">
                          <VideoPlayer videoUrl={message.videoUrl} />
                          {message.videoId && (
                            <div className="mt-2 flex justify-end">
                              <Link
                                to={`/editor/${message.videoId}`}
                                className="inline-flex items-center text-xs text-gray-600 hover:text-gray-900 border rounded px-2 py-1"
                                title="Edit video"
                              >
                                <Edit3 className="h-3 w-3 mr-1" /> Edit
                              </Link>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Loading State */}
                      {message.status === 'generating' && (
                        <div className="mt-3 flex items-center space-x-2 text-primary-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">
                            {message.isEnhancement ? 'Enhancing video...' : 'Generating video...'}
                          </span>
                        </div>
                      )}
                      
                      {/* Enhanced Prompt Info */}
                      {message.enhancedPrompt && message.enhancedPrompt !== message.originalPrompt && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs text-blue-600 font-medium">Enhanced prompt:</p>
                          <p className="text-xs text-blue-800 mt-1">{message.enhancedPrompt}</p>
                        </div>
                      )}
                      
                      {/* Intent and Confidence */}
                      {message.intent && message.confidence && (
                        <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
                          <span>Intent: {message.intent}</span>
                          <span>•</span>
                          <span>Confidence: {Math.round(message.confidence * 100)}%</span>
                        </div>
                      )}
                      
                      {/* Timestamp */}
                      <div className={`text-xs mt-2 ${
                        message.type === 'user' ? 'text-primary-100' : 'text-gray-400'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="p-6 border-t border-gray-200 bg-white/80 backdrop-blur-sm"
          >
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-200">
              {/* Controls row */}
              <div className="flex flex-wrap items-center gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Quality</label>
                  <select
                    value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                    className="bg-white border border-gray-200 rounded px-2 py-1 text-sm"
                  >
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                    <option value="2k">2K</option>
                    <option value="4k">4K</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Duration</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={duration}
                    onChange={(e) => setDuration(parseInt(e.target.value || '5'))}
                    className="w-20 bg-white border border-gray-200 rounded px-2 py-1 text-sm"
                  />
                  <span className="text-sm text-gray-500">s</span>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">Aspect</label>
                  <select
                    value={aspectRatio}
                    onChange={(e) => setAspectRatio(e.target.value)}
                    className="bg-white border border-gray-200 rounded px-2 py-1 text-sm"
                  >
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                    <option value="1:1">1:1</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Input Field */}
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder={selectedVideo ? "Enhance this video..." : "Describe the video you want to create..."}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                    className="w-full px-4 py-3 pr-20 bg-secondary-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    disabled={isGenerating}
                  />
                  
                  {/* Action Buttons */}
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                    <button className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={isGenerating || !prompt.trim()}
                      className="p-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

    </div>
  );
};

export default AIVideoStudio;