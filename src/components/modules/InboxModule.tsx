import { useState, useEffect } from 'react';
import { Search, Phone, Bot, AlertTriangle, Send, User, CheckCircle2, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CurrentUser {
  id: string;
  username: string;
  full_name: string;
  role: 'admin' | 'vendedor' | 'cajero';
}

interface Chat {
  id: string;
  phone_number: string;
  customer_name?: string;
  last_message: string;
  last_message_at: string;
  status: 'active' | 'paused' | 'resolved';
  requires_attention: boolean;
  unread_count: number;
}

interface Message {
  id: string;
  chat_id: string;
  content: string;
  role: 'user' | 'assistant' | 'system' | 'agent';
  created_at: string;
}

interface InboxModuleProps {
  currentUser: CurrentUser;
}

export default function InboxModule({ currentUser }: InboxModuleProps) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'attention' | 'active'>('attention');
  const [replyText, setReplyText] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    fetchChats();
    const interval = setInterval(fetchChats, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
      const interval = setInterval(() => fetchMessages(selectedChatId), 5000);
      return () => clearInterval(interval);
    } else {
      setMessages([]);
    }
  }, [selectedChatId]);

  const fetchChats = async () => {
    const { data } = await supabase
      .from('crm_chats')
      .select('*')
      .order('last_message_at', { ascending: false });
    if (data) setChats(data);
  };

  const fetchMessages = async (chatId: string) => {
    const { data } = await supabase
      .from('crm_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const filteredChats = chats.filter(chat => {
    if (filter === 'attention') return chat.requires_attention;
    if (filter === 'active') return chat.status === 'active';
    return true;
  });

  const selectedChat = chats.find(c => c.id === selectedChatId);

  const handleSendMessage = async () => {
    if (!replyText.trim() || !selectedChat) return;
    const textToSend = replyText.trim();
    setReplyText('');
    
    if (selectedChat.status === 'active') {
      await supabase.from('crm_chats').update({ status: 'paused', requires_attention: false }).eq('id', selectedChat.id);
    } else if (selectedChat.requires_attention) {
      await supabase.from('crm_chats').update({ requires_attention: false }).eq('id', selectedChat.id);
    }
    
    await supabase.from('crm_messages').insert([{ chat_id: selectedChat.id, content: textToSend, role: 'agent' }]);
    fetchMessages(selectedChat.id);
    fetchChats();
    
    await fetch('/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: selectedChat.phone_number, text: textToSend })
    });
  };

  const handleResumeBot = async () => {
    if (!selectedChat) return;
    await supabase.from('crm_chats').update({ status: 'active', requires_attention: false, bot_state: 'initial' }).eq('id', selectedChat.id);
    await supabase.from('crm_messages').insert([{ chat_id: selectedChat.id, content: 'El agente ha reactivado el asistente virtual.', role: 'system' }]);
    fetchChats();
    fetchMessages(selectedChat.id);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-[calc(100vh-8rem)] flex overflow-hidden">
      {/* Sidebar - Chat List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="p-4 border-b border-gray-200 bg-white">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Inbox de {currentUser.full_name.split(' ')[0]}</h2>
          
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setFilter('attention')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                filter === 'attention' 
                  ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Requiere Atención
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all' 
                  ? 'bg-gray-800 text-white border border-gray-800' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Todos
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o número..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredChats.map(chat => (
            <div
              key={chat.id}
              onClick={() => setSelectedChatId(chat.id)}
              className={`p-4 border-b border-gray-100 cursor-pointer transition-colors ${
                selectedChatId === chat.id 
                  ? 'bg-amber-50 border-l-4 border-l-amber-500' 
                  : 'bg-white hover:bg-gray-50 border-l-4 border-l-transparent'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  {chat.customer_name || 'Desconocido'}
                  {chat.requires_attention && (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-sm text-gray-500 flex items-center gap-1 mb-1">
                <Phone className="w-3 h-3" />
                {chat.phone_number}
              </div>
              <p className="text-sm text-gray-600 truncate">{chat.last_message}</p>
            </div>
          ))}
          {filteredChats.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No hay conversaciones en esta vista.
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50/50">
        {selectedChatId && selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-6 border-b border-gray-200 bg-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">{selectedChat.customer_name || selectedChat.phone_number}</h3>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">{selectedChat.phone_number}</span>
                  <span className="text-gray-300">•</span>
                  {selectedChat.status === 'paused' ? (
                    <span className="text-red-600 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3 h-3" /> Bot Pausado
                    </span>
                  ) : (
                    <span className="text-green-600 flex items-center gap-1 font-medium">
                      <Bot className="w-3 h-3" /> Bot Activo
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {selectedChat.status === 'paused' && (
                  <button
                    onClick={handleResumeBot}
                    className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors border border-green-200"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Reactivar Bot
                  </button>
                )}
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <User className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-start' : msg.role === 'system' ? 'justify-center' : 'justify-end'}`}>
                  {msg.role === 'system' ? (
                    <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-xs font-medium border border-red-100 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {msg.content}
                    </div>
                  ) : (
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      msg.role === 'user' 
                        ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm' 
                        : 'bg-amber-600 text-white rounded-tr-none shadow-sm'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                      <div className={`text-[10px] mt-1 text-right ${msg.role === 'user' ? 'text-gray-400' : 'text-amber-200'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.role === 'assistant' && ' • (Bot)'}
                        {msg.role === 'agent' && ' • (Asesor)'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
              {selectedChat.status === 'active' && (
                <div className="mb-2 text-xs text-amber-600 font-medium flex items-center gap-1 bg-amber-50 p-2 rounded-lg border border-amber-100">
                  <Bot className="w-3 h-3" />
                  El bot está activo. Si envías un mensaje, el bot se pausará automáticamente para que puedas intervenir.
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Escribe un mensaje al cliente..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!replyText.trim()}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium">Enviar</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg font-medium text-gray-600">Bandeja de Entrada</p>
            <p className="text-sm mt-1 text-center max-w-sm">
              Selecciona una conversación del panel izquierdo para ver los mensajes o responder.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
