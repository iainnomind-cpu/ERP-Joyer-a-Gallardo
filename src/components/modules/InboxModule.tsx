import { useState } from 'react';
import { Search, Phone, Bot, AlertTriangle, Send, User, CheckCircle2, MessageSquare } from 'lucide-react';

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

// Mock Data
const MOCK_CHATS: Chat[] = [
  {
    id: 'chat-1',
    phone_number: '5215551234567',
    customer_name: 'María García',
    last_message: 'Quiero hablar con un humano por favor.',
    last_message_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    status: 'paused',
    requires_attention: true,
    unread_count: 1,
  },
  {
    id: 'chat-2',
    phone_number: '5215559876543',
    customer_name: 'Juan Pérez',
    last_message: '¿Tienen anillos de compromiso de oro blanco?',
    last_message_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    status: 'active',
    requires_attention: false,
    unread_count: 0,
  },
  {
    id: 'chat-3',
    phone_number: '5215554567890',
    last_message: 'Gracias por la información, ya hice mi compra.',
    last_message_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    status: 'resolved',
    requires_attention: false,
    unread_count: 0,
  }
];

const MOCK_MESSAGES: Record<string, Message[]> = {
  'chat-1': [
    { id: 'm1', chat_id: 'chat-1', role: 'user', content: 'Hola, tengo una duda sobre un anillo', created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString() },
    { id: 'm2', chat_id: 'chat-1', role: 'assistant', content: '¡Hola! Claro, puedes ver nuestro catálogo en línea en www.gallardojoyas.com. ¿Buscas algo en específico?', created_at: new Date(Date.now() - 1000 * 60 * 9).toISOString() },
    { id: 'm3', chat_id: 'chat-1', role: 'user', content: 'Quiero hablar con un humano por favor.', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    { id: 'm4', chat_id: 'chat-1', role: 'system', content: 'El cliente ha solicitado atención humana. El bot ha sido pausado.', created_at: new Date(Date.now() - 1000 * 60 * 5 + 1000).toISOString() },
  ]
};

interface InboxModuleProps {
  currentUser: CurrentUser;
}

export default function InboxModule({ currentUser }: InboxModuleProps) {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'attention' | 'active'>('attention');
  const [replyText, setReplyText] = useState('');

  const filteredChats = MOCK_CHATS.filter(chat => {
    if (filter === 'attention') return chat.requires_attention;
    if (filter === 'active') return chat.status === 'active';
    return true;
  });

  const selectedChat = MOCK_CHATS.find(c => c.id === selectedChatId);
  const messages = selectedChatId ? MOCK_MESSAGES[selectedChatId] || [] : [];

  const handleSendMessage = () => {
    if (!replyText.trim() || !selectedChatId) return;
    // Here we would send the message to the DB and WhatsApp API
    console.log('Sending message:', replyText, 'to chat:', selectedChatId);
    setReplyText('');
  };

  const handleResumeBot = () => {
    // Logic to resume the bot for this chat
    console.log('Resuming bot for chat:', selectedChatId);
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
