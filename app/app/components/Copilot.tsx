'use client';

import React, { useState, useRef, useEffect } from 'react';

interface CopilotMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CopilotProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string) => void;
}

const Copilot: React.FC<CopilotProps> = ({ isOpen, onClose, onAction }) => {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: "Hello! I'm your Nexxau Copilot. I can help you analyze worksite data, generate reports, set up alerts, and much more. What would you like to do today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: CopilotMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const response = generateCopilotResponse(inputValue);
      const assistantMessage: CopilotMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000);
  };

  const generateCopilotResponse = (userInput: string): string => {
    const input = userInput.toLowerCase();
    
    if (input.includes('create') && input.includes('rule')) {
      return "I can help you create intelligent safety rules! Here are the main categories:\n\n🪖 **PPE Compliance**: Helmet detection, safety vest monitoring, proper gear usage\n🚗 **Equipment Safety**: Speed violations, unauthorized access, proximity alerts\n🚫 **Site Hazards**: Restricted areas, unsafe practices, zone violations\n👥 **Behavioral**: Worker density, loitering, fatigue detection\n🔥 **Environmental**: Smoke/fire, sound anomalies, emergency response\n\nClick 'Create Safety Rule' to get started with our template-based rule builder!";
    }
    
    if (input.includes('report') || input.includes('generate')) {
      return "I can help you generate various reports! Here are some options:\n\n📊 **Safety Incident Report** - Analyze recent incidents and trends\n📈 **Performance Analytics** - Camera detection accuracy and response times\n🚨 **Alert Summary** - Overview of all active alerts and their status\n👷 **Worker Compliance Report** - PPE usage and safety violations\n\nWhich type of report would you like me to generate?";
    }
    
    if (input.includes('alert') || input.includes('rule')) {
      return "Great! I can help you set up intelligent alert rules. Let me show you some common patterns:\n\n🔴 **PPE Detection**: Alert when workers enter without proper safety gear\n🚗 **Speed Monitoring**: Detect vehicles exceeding speed limits\n🚫 **Zone Violations**: Alert when someone enters restricted areas\n👥 **Crowd Detection**: Monitor for unauthorized gatherings\n\nWould you like me to help you configure any of these, or do you have a specific alert in mind?";
    }
    
    if (input.includes('data') || input.includes('analyze') || input.includes('trend')) {
      return "I can analyze your worksite data to identify patterns and insights! Here's what I can help with:\n\n📊 **Trend Analysis**: Identify recurring safety issues\n🎯 **Hot Spots**: Find areas with highest incident rates\n⏰ **Time Patterns**: Discover when incidents are most likely to occur\n📈 **Improvement Tracking**: Monitor safety metrics over time\n\nWhat specific data would you like me to analyze?";
    }
    
    if (input.includes('failure') || input.includes('problem') || input.includes('issue')) {
      return "I can help identify the biggest failures and issues across your worksites! Let me analyze:\n\n🚨 **Most Common Violations**: What safety rules are broken most often\n📍 **Problem Areas**: Which locations have the highest incident rates\n⏰ **Peak Problem Times**: When incidents are most likely to occur\n👷 **High-Risk Behaviors**: Patterns that lead to safety issues\n\nWould you like me to run a comprehensive analysis of your current data?";
    }
    
    if (input.includes('workflow') || input.includes('automation')) {
      return "I can help you create intelligent workflows that automatically respond to safety events! Here are some examples:\n\n🔄 **Auto-Escalation**: Automatically notify supervisors for critical violations\n📹 **Evidence Collection**: Start recording when incidents are detected\n📱 **Multi-Channel Alerts**: Send notifications via email, SMS, and push\n⚡ **Real-time Response**: Immediate actions based on detection results\n\nWhat type of workflow would you like to build?";
    }
    
    if (input.includes('help') || input.includes('what can you do')) {
      return "I'm your Nexxau AI assistant! Here's what I can help you with:\n\n📊 **Data Analysis**: Generate reports, analyze trends, identify patterns\n🚨 **Alert Management**: Set up rules, configure workflows, optimize notifications\n📈 **Performance Insights**: Monitor camera accuracy, response times, system health\n🔧 **System Setup**: Help configure cameras, zones, and detection parameters\n📋 **Compliance**: Track safety metrics, generate compliance reports\n\nJust tell me what you need help with!";
    }
    
    return "I understand you're asking about that. Let me help you get the information you need. Could you be more specific about what you'd like me to help you with? I can assist with data analysis, report generation, alert setup, and much more.";
  };

  const quickActions = [
    { label: 'Create Safety Rule', action: () => onAction?.('create-rule') || setInputValue('Help me create a new safety rule for PPE detection') },
    { label: 'Generate Safety Report', action: () => setInputValue('Generate a comprehensive safety report for this month') },
    { label: 'Analyze Incident Trends', action: () => setInputValue('What are the biggest safety failures across all worksites?') },
    { label: 'Set Up PPE Alert', action: () => setInputValue('Help me set up an alert for workers without hard hats') },
    { label: 'Camera Performance', action: () => setInputValue('Show me camera detection accuracy and performance metrics') }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl h-[80vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xl">🤖</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Nexxau Copilot</h2>
              <p className="text-gray-400 text-sm">Your AI assistant for worksite safety</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quick Actions */}
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors border border-gray-600 hover:border-gray-500"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-100 border border-gray-700'
                }`}
              >
                <div className="whitespace-pre-line">{message.content}</div>
                <div className={`text-xs mt-2 ${
                  message.type === 'user' ? 'text-blue-200' : 'text-gray-400'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-800 text-gray-100 border border-gray-700 rounded-2xl px-4 py-3">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-6 border-t border-gray-700">
          <div className="flex space-x-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me anything about your worksite safety, data, or alerts..."
              className="flex-1 bg-gray-800 border border-gray-600 rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Copilot;
