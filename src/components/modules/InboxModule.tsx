import { useState, useEffect, useRef } from 'react';
import { Search, Phone, Bot, AlertTriangle, Send, User, CheckCircle2, MessageSquare, Paperclip, Smile, MapPin, MoreVertical, X, Save, Clock, Image as ImageIcon, FileText } from 'lucide-react';
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
  const [filter, setFilter] = useState<'all' | 'attention' | 'active'>('all');
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showClipMenu, setShowClipMenu] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const attentionCount = chats.filter(c => c.requires_attention).length;

  const selectedChat = chats.find(c => c.id === selectedChatId);

  // Update edit states when chat changes
  useEffect(() => {
    if (selectedChat) {
      setEditName(selectedChat.customer_name || '');
    }
  }, [selectedChatId, selectedChat?.customer_name]);

  const handleSaveUserInfo = async () => {
    if (!selectedChat || !editName.trim()) return;
    setIsSaving(true);
    try {
      await supabase.from('crm_chats').update({ customer_name: editName.trim() }).eq('id', selectedChat.id);
      fetchChats();
      setIsUserInfoOpen(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendMessage = async (textToSend: string = replyText, type: 'text' | 'image' | 'document' = 'text', url?: string) => {
    if (!textToSend.trim() && !url) return;
    if (!selectedChat) return;
    
    setReplyText('');
    
    if (selectedChat.status === 'active') {
      await supabase.from('crm_chats').update({ status: 'paused', requires_attention: false }).eq('id', selectedChat.id);
    } else if (selectedChat.requires_attention) {
      await supabase.from('crm_chats').update({ requires_attention: false }).eq('id', selectedChat.id);
    }
    
    const displayContent = type === 'text' ? textToSend : url || textToSend;
    await supabase.from('crm_messages').insert([{ chat_id: selectedChat.id, content: displayContent, role: 'agent' }]);
    
    fetchMessages(selectedChat.id);
    fetchChats();
    
    await fetch('/api/send-message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: selectedChat.phone_number, text: textToSend, type, url })
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'document') => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;

    try {
      setIsUploading(true);
      setShowClipMenu(false);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `whatsapp/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('chat-media').upload(filePath, file);
      
      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage.from('chat-media').getPublicUrl(filePath);
      
      await handleSendMessage(file.name, type, publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Error al subir el archivo. Asegúrate de tener el bucket "chat-media" configurado en Supabase como público.');
    } finally {
      setIsUploading(false);
      // Reset input
      if (e.target) e.target.value = '';
    }
  };

  const handleSendLocation = async () => {
    if (!selectedChat) return;
    const ubicacionText = '💎 Joyería Gallardo\n📍 Paseo del Hospicio #65, locales A y B, Centro Joyero\n🗺️ https://www.google.com/maps/search/?api=1&query=Paseo+del+Hospicio+65+Guadalajara\n🕒 Lun-Vie 9am-6pm | Sáb 9am-3pm';
    
    if (window.confirm('¿Deseas enviar la ubicación de la joyería al cliente?')) {
      await handleSendMessage(ubicacionText, 'text');
    }
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
              className={`flex-1 py-1.5 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                filter === 'attention' 
                  ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Atención
              {attentionCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {attentionCount}
                </span>
              )}
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
                <button 
                  onClick={() => setIsUserInfoOpen(!isUserInfoOpen)}
                  className={`p-2 rounded-lg transition-colors ${isUserInfoOpen ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                >
                  <User className="w-5 h-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                  <MoreVertical className="w-5 h-5" />
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
                      {msg.content.startsWith('http') && (msg.content.includes('.jpg') || msg.content.includes('.png') || msg.content.includes('.jpeg')) ? (
                        <div className="mb-2">
                          <img src={msg.content} alt="Adjunto" className="max-w-full rounded-lg cursor-pointer" onClick={() => window.open(msg.content)} />
                        </div>
                      ) : msg.content.startsWith('http') ? (
                        <div className="mb-2">
                          <a href={msg.content} target="_blank" rel="noreferrer" className="underline font-medium break-all flex items-center gap-1">
                            <FileText className="w-4 h-4" /> Ver Documento Adjunto
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                      <div className={`text-[10px] mt-1 text-right ${msg.role === 'user' ? 'text-gray-400' : 'text-amber-200'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.role === 'assistant' && ' • (Bot)'}
                        {msg.role === 'agent' && ' • (Asesor)'}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
              {selectedChat.status === 'active' && (
                <div className="mb-2 text-xs text-amber-600 font-medium flex items-center gap-1 bg-amber-50 p-2 rounded-lg border border-amber-100">
                  <Bot className="w-3 h-3" />
                  El bot está activo. Si envías un mensaje, el bot se pausará automáticamente para que puedas intervenir.
                </div>
              )}
              <div className="flex gap-2 items-center relative">
                {/* Popover Adjuntos */}
                {showClipMenu && (
                  <div className="absolute bottom-14 left-0 bg-white border border-gray-200 shadow-xl rounded-xl p-2 w-48 z-50">
                    <button onClick={() => { fileInputRef.current?.click(); setShowClipMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-gray-700 transition-colors rounded-lg text-left">
                      <ImageIcon className="w-5 h-5 text-blue-500" />
                      <span className="text-sm font-medium">Fotos y Videos</span>
                    </button>
                    <button onClick={() => { docInputRef.current?.click(); setShowClipMenu(false); }} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-gray-700 transition-colors rounded-lg text-left">
                      <FileText className="w-5 h-5 text-purple-500" />
                      <span className="text-sm font-medium">Documento</span>
                    </button>
                  </div>
                )}
                
                {/* Inputs ocultos */}
                <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, 'image')} accept="image/*,video/*" className="hidden" />
                <input type="file" ref={docInputRef} onChange={(e) => handleFileUpload(e, 'document')} className="hidden" />

                <button 
                  onClick={() => { setShowClipMenu(!showClipMenu); setShowEmojiPicker(false); }}
                  disabled={isUploading}
                  className={`p-2 rounded-lg transition-colors ${showClipMenu ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`} 
                  title="Adjuntar archivo"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => { handleSendLocation(); setShowClipMenu(false); setShowEmojiPicker(false); }}
                  disabled={isUploading}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors hidden sm:block" 
                  title="Enviar ubicación"
                >
                  <MapPin className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(replyText, 'text')}
                  placeholder={isUploading ? "Subiendo archivo..." : "Escribe un mensaje al cliente..."}
                  disabled={isUploading}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                
                {/* Emoji Picker Popover */}
                {showEmojiPicker && (
                  <div className="absolute bottom-14 right-24 bg-white border border-gray-200 shadow-xl rounded-xl p-2 w-64 z-50">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <span className="text-xs font-medium text-gray-500">Emojis rápidos</span>
                      <button onClick={() => setShowEmojiPicker(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-6 gap-1">
                      {['😊','😂','🥰','😍','🙏','👍','💎','💍','✨','🤍','📞','✅','📦','💳','🚚','📍','👋','🔥'].map(emoji => (
                        <button
                          key={emoji}
                          onClick={() => {
                            setReplyText(prev => prev + emoji);
                            setShowEmojiPicker(false);
                          }}
                          className="hover:bg-gray-100 p-1.5 rounded text-lg flex items-center justify-center transition-colors"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2 rounded-lg transition-colors ${showEmojiPicker ? 'bg-amber-100 text-amber-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`} 
                  title="Emojis"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleSendMessage(replyText, 'text')}
                  disabled={!replyText.trim() || isUploading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline font-medium">Enviar</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-white">
            <MessageSquare className="w-16 h-16 text-gray-200 mb-4" />
            <p className="text-lg font-medium text-gray-600">Bandeja de Entrada</p>
            <p className="text-sm mt-1 text-center max-w-sm">
              Selecciona una conversación del panel izquierdo para ver los mensajes o responder.
            </p>
          </div>
        )}
      </div>

      {/* Right Sidebar - User Info */}
      {selectedChatId && selectedChat && isUserInfoOpen && (
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
          <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Información del Cliente</h3>
            <button 
              onClick={() => setIsUserInfoOpen(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 flex-1 overflow-y-auto">
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-2xl font-bold mb-3">
                {selectedChat.customer_name ? selectedChat.customer_name.charAt(0).toUpperCase() : <User className="w-10 h-10" />}
              </div>
              <h4 className="font-bold text-lg text-gray-900 text-center">{selectedChat.customer_name || 'Desconocido'}</h4>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <Phone className="w-4 h-4" /> {selectedChat.phone_number}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Nombre en CRM</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                  placeholder="Ej. Juan Pérez"
                />
              </div>

              <button
                onClick={handleSaveUserInfo}
                disabled={isSaving || editName.trim() === selectedChat.customer_name}
                className="w-full py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Actividad Reciente</h5>
              
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Última interacción</p>
                  <p className="text-xs text-gray-500">
                    {new Date(selectedChat.last_message_at).toLocaleDateString()} a las {new Date(selectedChat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Estado del Bot</p>
                  <p className="text-xs text-gray-500">
                    {selectedChat.status === 'active' ? 'Activo y respondiendo' : 'Pausado (Atención manual)'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
