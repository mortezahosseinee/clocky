import React, { useState, useEffect, useRef, useMemo } from 'react';
import { User, ChatMessage } from '../types';
import { Language, translations } from '../utils/translations';
import { StorageService } from '../utils/storage';
import { toPersianDigits, getTodayJalali } from '../utils/jalali';
import { UserAvatar } from '../components/UserAvatar';
import {
  Send,
  Paperclip,
  Smile,
  Search,
  Check,
  CheckCheck,
  X,
  CornerUpLeft,
  Trash2,
  Users,
  MessageSquare,
  Image as ImageIcon,
  FileText,
  Clock,
  Sparkles,
  Phone,
  Video,
  Info,
  Shield,
  Circle
} from 'lucide-react';

interface MessengerViewProps {
  user: User;
  lang: Language;
}

const COMMON_EMOJIS = ['👍', '❤️', '👏', '🙏', '😊', '🎉', '🌹', '🤝', '✅', '👌', '🔥', '✨'];

export const MessengerView: React.FC<MessengerViewProps> = ({ user, lang }) => {
  const isPersian = lang === 'fa';
  const t = translations[lang];

  // Users from system (Contacts: "مخاطبین در واقع همین کاربران این نرم افزار هستن و قابلیت اضافه کردنشون رو فقط مدیر داره")
  const [contacts, setContacts] = useState<User[]>(() =>
    StorageService.getUsers(true).filter(u => u.isActive !== false && !u.isArchived && u.id !== user.id)
  );

  // Active sessions to determine who is online
  const [activeSessions, setActiveSessions] = useState(() => StorageService.getSessions());

  // Messages list
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  // Active selected conversation: 'channel:general' or a user's id
  const [selectedChatId, setSelectedChatId] = useState<string>('channel:general');

  // Input states
  const [inputText, setInputText] = useState('');
  const [attachment, setAttachment] = useState<{
    name: string;
    type: 'image' | 'video' | 'file';
    url: string;
    size?: string;
    sizeBytes?: number;
  } | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showChatSearch, setShowChatSearch] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to mark conversation read on server & trigger global update
  const markConversationAsRead = (convId: string) => {
    if (!convId) return;
    fetch('/api/messages/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, conversationId: convId })
    })
      .then(() => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('messages_read', { detail: { userId: user.id, conversationId: convId } }));
        }
      })
      .catch(() => {});
  };

  // Mark all conversations and messages as read
  const handleMarkAllAsRead = async () => {
    // 1. Optimistically mark all messages as read locally
    setMessages(prev =>
      prev.map(m => ({
        ...m,
        status: 'read',
        readBy: Array.isArray(m.readBy)
          ? (m.readBy.includes(user.id) ? m.readBy : [...m.readBy, user.id])
          : [user.id]
      }))
    );
    // 2. Call server
    try {
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, conversationId: 'all' })
      });
    } catch {}
    // 3. Dispatch global event so Sidebar updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('messages_read', { detail: { userId: user.id, conversationId: 'all' } }));
    }
  };

  // Helper to select chat and immediately clear its unread badge
  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    setMessages(prev =>
      prev.map(m => {
        const isTarget = (chatId === 'channel:general' && (m.receiverId === 'channel:general' || m.receiverType === 'channel')) ||
                         (m.senderId === chatId && m.receiverId === user.id) ||
                         (String(chatId).startsWith('group:') && m.receiverId === chatId);
        if (isTarget && !m.readBy?.includes(user.id)) {
          return { ...m, status: 'read', readBy: [...(m.readBy || []), user.id] };
        }
        return m;
      })
    );
    markConversationAsRead(chatId);
  };

  // Fetch messages from server
  const fetchMessages = () => {
    fetch(`/api/messages?userId=${encodeURIComponent(user.id)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.messages)) {
          const updated = data.messages.map((m: any) => {
            const isCurrentChat = (selectedChatId === 'channel:general' && m.receiverId === 'channel:general') ||
                                  (m.senderId === selectedChatId && m.receiverId === user.id) ||
                                  (String(selectedChatId).startsWith('group:') && m.receiverId === selectedChatId);
            if (isCurrentChat && !m.readBy?.includes(user.id)) {
              return { ...m, status: 'read', readBy: [...(m.readBy || []), user.id] };
            }
            return m;
          });
          setMessages(updated);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  // Sync contacts & sessions continuously
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(() => {
      fetchMessages();
      setActiveSessions(StorageService.getSessions());
      setContacts(StorageService.getUsers(true).filter(u => u.isActive !== false && !u.isArchived && u.id !== user.id));
    }, 3000);

    return () => clearInterval(interval);
  }, [user.id, selectedChatId]);

  // Mark messages as read when opening conversation or new messages arrive
  useEffect(() => {
    if (!selectedChatId) return;
    markConversationAsRead(selectedChatId);

    // Also update local messages readBy
    setMessages(prev =>
      prev.map(m => {
        const isTarget = (selectedChatId === 'channel:general' && m.receiverId === 'channel:general') ||
                         (m.senderId === selectedChatId && m.receiverId === user.id) ||
                         (String(selectedChatId).startsWith('group:') && m.receiverId === selectedChatId);
        if (isTarget && !m.readBy?.includes(user.id)) {
          return { ...m, status: 'read', readBy: [...(m.readBy || []), user.id] };
        }
        return m;
      })
    );
  }, [selectedChatId, messages.length, user.id]);

  // Auto scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, [selectedChatId]);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages.length]);

  // Selected contact object or general channel
  const selectedContact = useMemo(() => {
    if (selectedChatId === 'channel:general') {
      return {
        id: 'channel:general',
        username: 'general',
        firstName: isPersian ? 'کانال عمومی' : 'General Channel',
        lastName: isPersian ? 'گفتگوی پرسنل' : 'All Staff',
        jobTitle: isPersian ? 'ارتباط جمعی کلیه کارکنان سازمان' : 'Company-wide communication',
        role: 'all' as any,
        isChannel: true,
        avatar: undefined as string | undefined
      };
    }
    return contacts.find(c => c.id === selectedChatId) || null;
  }, [selectedChatId, contacts, isPersian]);

  // Check if contact is online
  const isUserOnline = (userId: string) => {
    return activeSessions.some(s => s.userId === userId && s.isActive);
  };

  // Filter contacts by search
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(c =>
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q) ||
      c.username.toLowerCase().includes(q) ||
      (c.jobTitle && c.jobTitle.toLowerCase().includes(q))
    );
  }, [contacts, searchQuery]);

  // Current conversation messages
  const conversationMessages = useMemo(() => {
    let list = messages.filter(m => {
      if (selectedChatId === 'channel:general') {
        return m.receiverId === 'channel:general';
      }
      return (
        (m.senderId === user.id && m.receiverId === selectedChatId) ||
        (m.senderId === selectedChatId && m.receiverId === user.id)
      );
    });

    if (chatSearchQuery.trim()) {
      const q = chatSearchQuery.toLowerCase();
      list = list.filter(m => m.text.toLowerCase().includes(q) || m.senderName.toLowerCase().includes(q));
    }

    return list;
  }, [messages, selectedChatId, user.id, chatSearchQuery]);

  // Unread counts per contact & channel
  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = { 'channel:general': 0 };
    for (const m of messages) {
      if (m.senderId === user.id) continue;
      const isRead = m.readBy?.includes(user.id);
      if (!isRead) {
        if (m.receiverId === 'channel:general' || m.receiverType === 'channel') {
          counts['channel:general'] = (counts['channel:general'] || 0) + 1;
        } else if (m.receiverId === user.id) {
          counts[m.senderId] = (counts[m.senderId] || 0) + 1;
        } else if (String(m.receiverId).startsWith('group:')) {
          counts[m.receiverId] = (counts[m.receiverId] || 0) + 1;
        }
      }
    }
    // Never show badge for the currently active conversation
    if (selectedChatId && counts[selectedChatId] !== undefined) {
      counts[selectedChatId] = 0;
    }
    return counts;
  }, [messages, user.id, selectedChatId]);

  // Last message per contact
  const getLastMessageInfo = (contactId: string) => {
    const list = messages.filter(m => {
      if (contactId === 'channel:general') return m.receiverId === 'channel:general';
      return (
        (m.senderId === user.id && m.receiverId === contactId) ||
        (m.senderId === contactId && m.receiverId === user.id)
      );
    });
    if (list.length === 0) return null;
    return list[list.length - 1];
  };

  // Process image with client-side canvas downscaling (max 1600px) or read file
  const processMediaFile = (file: File): Promise<{
    name: string;
    type: 'image' | 'video' | 'file';
    url: string;
    size: string;
    sizeBytes: number;
  }> => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const attType: 'image' | 'video' | 'file' = isImage ? 'image' : (isVideo ? 'video' : 'file');

    const formatSize = (bytes: number) =>
      bytes > 1024 * 1024
        ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
        : `${(bytes / 1024).toFixed(0)} KB`;

    if (isImage) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const rawUrl = e.target?.result as string;
          const img = new Image();
          img.onload = () => {
            const maxDim = 1600;
            let w = img.width;
            let h = img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              const compressedUrl = canvas.toDataURL('image/jpeg', 0.82);
              const approxBytes = Math.round((compressedUrl.length * 3) / 4);
              resolve({
                name: file.name,
                type: 'image',
                url: compressedUrl,
                size: formatSize(approxBytes),
                sizeBytes: approxBytes
              });
              return;
            }
            resolve({
              name: file.name,
              type: 'image',
              url: rawUrl,
              size: formatSize(file.size),
              sizeBytes: file.size
            });
          };
          img.onerror = () => {
            resolve({
              name: file.name,
              type: 'image',
              url: rawUrl,
              size: formatSize(file.size),
              sizeBytes: file.size
            });
          };
          img.src = rawUrl;
        };
        reader.readAsDataURL(file);
      });
    }

    // Video or general file
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const rawUrl = e.target?.result as string;
        resolve({
          name: file.name,
          type: attType,
          url: rawUrl,
          size: formatSize(file.size),
          sizeBytes: file.size
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Handle File Upload (Images / Videos / Documents)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      alert(isPersian ? 'حجم فایل نباید بیش از ۲۵ مگابایت باشد.' : 'File size limit is 25MB.');
      return;
    }

    setIsUploadingAttachment(true);
    try {
      const att = await processMediaFile(file);
      setAttachment(att);
    } catch (err: any) {
      alert(isPersian ? 'خطا در بارگذاری فایل: ' + err.message : 'Error loading attachment');
    } finally {
      setIsUploadingAttachment(false);
      e.target.value = '';
    }
  };

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !attachment) || isSending || isUploadingAttachment) return;

    setIsSending(true);
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderId: user.id,
      senderName: `${user.firstName} ${user.lastName}`,
      senderAvatar: user.avatar,
      receiverId: selectedChatId,
      receiverType: selectedChatId === 'channel:general' ? 'channel' : 'direct',
      text: inputText.trim(),
      attachment: attachment || undefined,
      replyTo: replyingTo
        ? {
            id: replyingTo.id,
            senderName: replyingTo.senderName,
            text: replyingTo.text
          }
        : undefined,
      timestamp: new Date().toISOString(),
      timestampFa: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      readBy: [user.id]
    };

    // Optimistic UI update
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setAttachment(null);
    setReplyingTo(null);
    setShowEmojiPicker(false);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMsg)
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        alert(isPersian ? 'خطا در ارسال پیام: ' + (errJson.error || res.statusText) : 'Error sending message');
        setMessages(prev => prev.map(m => m.id === newMsg.id ? { ...m, status: 'error' as any } : m));
      }
    } catch (err: any) {
      console.warn('Network warning on send:', err);
      alert(isPersian ? 'خطا در اتصال به سرور جهت ارسال پیام: ' + (err.message || 'شبکه در دسترس نیست') : 'Network error sending message');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Delete Message
  const handleDeleteMessage = async (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    try {
      await fetch(`/api/messages/${msgId}`, { method: 'DELETE' });
    } catch {}
  };

  return (
    <div className="h-[calc(100vh-5.5rem)] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden select-none">
      <div className="flex flex-1 h-full overflow-hidden">
        {/* SIDEBAR: CONTACTS LIST */}
        <div className="w-80 sm:w-88 border-l border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/60 shrink-0">
          {/* Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {isPersian ? 'پیام‌رسان سازمانی' : 'Corporate Messenger'}
                </h2>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-b-nazanin">
                  {isPersian ? `${toPersianDigits(contacts.length)} همکار در سامانه` : `${contacts.length} Colleagues`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={isPersian ? 'علامت‌گذاری همه پیام‌ها به عنوان خوانده شده' : 'Mark all messages as read'}
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>{isPersian ? 'آنلاین' : 'Online'}</span>
              </span>
            </div>
          </div>

          {/* Search Box */}
          <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
              <input
                type="text"
                placeholder={isPersian ? 'جستجوی همکار، نام کاربری یا سمت...' : 'Search colleagues...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pr-9 pl-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Contacts / Chats Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {/* 1. General Public Channel (Always at Top) */}
            {(!searchQuery || 'کانال عمومی'.includes(searchQuery) || 'general'.includes(searchQuery.toLowerCase())) && (
              <button
                type="button"
                onClick={() => handleSelectChat('channel:general')}
                className={`w-full p-3.5 flex items-start gap-3 transition-colors cursor-pointer text-right ${
                  selectedChatId === 'channel:general'
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-r-4 border-blue-600'
                    : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs relative">
                  <Users className="w-5 h-5" />
                  <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 absolute -bottom-0.5 -left-0.5"></span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {isPersian ? 'کانال عمومی (کلیه پرسنل)' : 'General Channel (All Staff)'}
                    </span>
                    {(() => {
                      const last = getLastMessageInfo('channel:general');
                      return last ? (
                        <span className="text-[10px] text-slate-400 font-b-mitra font-time">
                          {toPersianDigits(last.timestampFa)}
                        </span>
                      ) : null;
                    })()}
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-b-nazanin truncate">
                    {(() => {
                      const last = getLastMessageInfo('channel:general');
                      if (last) {
                        return `${last.senderName}: ${last.text || (last.attachment ? (last.attachment.type === 'image' ? '🖼 تصویر' : '📎 فایل') : '')}`;
                      }
                      return isPersian ? 'گفتگوی همگانی، اعلانات و تبادل پیام پرسنل' : 'Public channel for company-wide chat';
                    })()}
                  </p>
                </div>

                {unreadCounts['channel:general'] > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white font-bold text-[10px] shrink-0 self-center">
                    {toPersianDigits(unreadCounts['channel:general'])}
                  </span>
                )}
              </button>
            )}

            {/* Section label */}
            <div className="px-4 py-2 bg-slate-100/60 dark:bg-slate-800/40 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>{isPersian ? 'همکاران و مخاطبین سازمانی' : 'Colleagues'}</span>
              <span className="text-slate-400 font-normal">
                {isPersian ? 'مدیریت توسط ادمین' : 'Admin managed'}
              </span>
            </div>

            {/* 2. Direct Contacts List */}
            {filteredContacts.map(c => {
              const isSelected = selectedChatId === c.id;
              const online = isUserOnline(c.id);
              const lastMsg = getLastMessageInfo(c.id);
              const unread = unreadCounts[c.id] || 0;

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectChat(c.id)}
                  className={`w-full p-3.5 flex items-start gap-3 transition-colors cursor-pointer text-right ${
                    isSelected
                      ? 'bg-blue-50/80 dark:bg-blue-950/40 border-r-4 border-blue-600'
                      : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <div className="relative shrink-0">
                    <UserAvatar
                      avatar={c.avatar}
                      firstName={c.firstName}
                      lastName={c.lastName}
                      size="md"
                      rounded="xl"
                    />
                    <span
                      className={`w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 absolute -bottom-0.5 -left-0.5 ${
                        online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}
                      title={online ? 'آنلاین' : 'آفلاین'}
                    ></span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                        {c.firstName} {c.lastName}
                      </span>
                      {lastMsg && (
                        <span className="text-[10px] text-slate-400 font-b-mitra font-time">
                          {toPersianDigits(lastMsg.timestampFa)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-b-nazanin truncate">
                        {lastMsg ? (
                          <span>
                            {lastMsg.senderId === user.id && (
                              <span className="text-blue-500 ml-1">شما:</span>
                            )}
                            {lastMsg.text || (lastMsg.attachment ? (lastMsg.attachment.type === 'image' ? '🖼 تصویر' : '📎 فایل') : '')}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">
                            {c.jobTitle || `@${c.username}`}
                          </span>
                        )}
                      </p>

                      {unread > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-blue-600 text-white font-bold text-[10px] shrink-0">
                          {toPersianDigits(unread)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {filteredContacts.length === 0 && (
              <div className="p-8 text-center text-slate-400 font-b-nazanin text-xs">
                {isPersian ? 'مخاطبی با این مشخصات یافت نشد.' : 'No colleagues found.'}
              </div>
            )}
          </div>
        </div>

        {/* MAIN CHAT AREA */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 min-w-0">
          {/* Chat Header */}
          <div className="p-3.5 px-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {selectedChatId === 'channel:general' ? (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
              ) : (
                <UserAvatar
                  avatar={selectedContact?.avatar}
                  firstName={selectedContact?.firstName}
                  lastName={selectedContact?.lastName}
                  size="md"
                  rounded="xl"
                />
              )}

              <div className="min-w-0">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {selectedContact?.firstName} {selectedContact?.lastName}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-b-nazanin truncate flex items-center gap-1.5">
                  {selectedChatId === 'channel:general' ? (
                    <span>{isPersian ? 'کانال عمومی ارتباط کلیه پرسنل سازمان' : 'All Company Members'}</span>
                  ) : (
                    <>
                      <span className={`w-2 h-2 rounded-full ${isUserOnline(selectedContact?.id || '') ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                      <span>{isUserOnline(selectedContact?.id || '') ? (isPersian ? 'آنلاین' : 'Online') : (isPersian ? 'آفلاین' : 'Offline')}</span>
                      {selectedContact?.jobTitle && <span>• {selectedContact.jobTitle}</span>}
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowChatSearch(!showChatSearch)}
                className={`p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ${
                  showChatSearch ? 'bg-blue-50 text-blue-600' : ''
                }`}
                title={isPersian ? 'جستجو در پیام‌ها' : 'Search in Chat'}
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search bar in chat */}
          {showChatSearch && (
            <div className="p-2.5 px-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={isPersian ? 'جستجو در متن پیام‌های این گفتگو...' : 'Search in this chat...'}
                value={chatSearchQuery}
                onChange={e => setChatSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 border-none focus:outline-hidden"
                autoFocus
              />
              {chatSearchQuery && (
                <button
                  onClick={() => setChatSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40 dark:bg-slate-950/40">
            {conversationMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center mb-3">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-1">
                  {isPersian ? 'گفتگو را آغاز کنید' : 'Start the conversation'}
                </h4>
                <p className="text-xs text-slate-400 font-b-nazanin max-w-sm">
                  {selectedChatId === 'channel:general'
                    ? (isPersian ? 'پیام‌های ارسالی در این کانال توسط کلیه پرسنل سازمان قابل مشاهده است.' : 'Messages in this channel are visible to all staff.')
                    : (isPersian ? `پیام‌های شما با همکارتان ${selectedContact?.firstName} ${selectedContact?.lastName} به صورت محرمانه و ایمن ردوبدل می‌شود.` : 'Private peer-to-peer message stream.')}
                </p>
              </div>
            ) : (
              conversationMessages.map((msg, index) => {
                const isMine = msg.senderId === user.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 group ${isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Other User Avatar */}
                    {!isMine && (
                      <UserAvatar
                        avatar={msg.senderAvatar}
                        firstName={msg.senderName}
                        size="sm"
                        rounded="xl"
                        className="mb-1"
                      />
                    )}

                    {/* Message Bubble Container */}
                    <div className={`max-w-[75%] sm:max-w-[65%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      {/* Sender Name in group channel */}
                      {!isMine && selectedChatId === 'channel:general' && (
                        <span className="text-[10px] font-bold text-blue-600 mb-1 px-1">
                          {msg.senderName}
                        </span>
                      )}

                      {/* Replying quote preview */}
                      {msg.replyTo && (
                        <div
                          className={`mb-1 px-3 py-1.5 rounded-xl text-[11px] font-b-nazanin border-r-3 max-w-full truncate ${
                            isMine
                              ? 'bg-blue-700/30 border-blue-400 text-blue-100'
                              : 'bg-slate-200/70 dark:bg-slate-800 border-slate-400 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <span className="font-bold block text-[10px] opacity-80">{msg.replyTo.senderName}</span>
                          <span className="truncate block">{msg.replyTo.text}</span>
                        </div>
                      )}

                      {/* Main Bubble */}
                      <div
                        className={`relative rounded-2xl px-4 py-2.5 shadow-2xs break-words text-xs leading-relaxed ${
                          isMine
                            ? 'bg-blue-600 text-white rounded-br-xs'
                            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-xs'
                        }`}
                      >
                        {/* Image attachment */}
                        {msg.attachment?.type === 'image' && (
                          <div className="mb-2 rounded-xl overflow-hidden max-w-sm">
                            <img
                              src={msg.attachment.url}
                              alt={msg.attachment.name}
                              className="w-full max-h-72 object-cover rounded-xl cursor-pointer hover:opacity-95 transition-opacity"
                              onClick={() => window.open(msg.attachment?.url, '_blank')}
                            />
                          </div>
                        )}

                        {/* Video attachment */}
                        {msg.attachment?.type === 'video' && (
                          <div className="mb-2 rounded-xl overflow-hidden max-w-sm">
                            <video
                              src={msg.attachment.url}
                              controls
                              className="w-full max-h-72 rounded-xl bg-black"
                            />
                            <div className="p-1 text-[10px] opacity-80 flex items-center justify-between font-mono">
                              <span className="truncate">{msg.attachment.name}</span>
                              {msg.attachment.size && <span>{msg.attachment.size}</span>}
                            </div>
                          </div>
                        )}

                        {/* File attachment */}
                        {msg.attachment?.type === 'file' && (
                          <div className={`mb-2 p-2.5 rounded-xl flex items-center gap-2.5 ${
                            isMine ? 'bg-blue-700/60' : 'bg-slate-100 dark:bg-slate-700'
                          }`}>
                            <FileText className="w-5 h-5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-bold text-xs truncate">{msg.attachment.name}</p>
                              {msg.attachment.size && (
                                <p className="text-[10px] opacity-75 font-mono">{msg.attachment.size}</p>
                              )}
                            </div>
                            <a
                              href={msg.attachment.url}
                              download={msg.attachment.name}
                              className="px-2 py-1 rounded bg-black/20 hover:bg-black/30 font-bold text-[10px] shrink-0"
                            >
                              دانلود
                            </a>
                          </div>
                        )}

                        {/* Text */}
                        {msg.text && (
                          <p className="whitespace-pre-wrap font-b-nazanin text-sm font-medium">
                            {msg.text}
                          </p>
                        )}

                        {/* Timestamp & Read Receipts */}
                        <div className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                          isMine ? 'text-blue-100' : 'text-slate-400 font-b-mitra'
                        }`}>
                          <span className="font-b-mitra font-time">{toPersianDigits(msg.timestampFa)}</span>
                          {isMine && (
                            <span className="flex items-center">
                              {msg.status === 'read' ? (
                                <span title="خوانده شد"><CheckCheck className="w-3.5 h-3.5 text-blue-200" /></span>
                              ) : (
                                <span title="ارسال شد"><Check className="w-3.5 h-3.5 text-blue-200" /></span>
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Hover action bar: reply / delete */}
                      <div className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-0.5 px-1 ${
                        isMine ? 'flex-row-reverse' : ''
                      }`}>
                        <button
                          type="button"
                          onClick={() => setReplyingTo(msg)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          title="پاسخ"
                        >
                          <CornerUpLeft className="w-3.5 h-3.5" />
                        </button>
                        {(isMine || user.role === 'admin') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="حذف پیام"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Replying quote bar */}
          {replyingTo && (
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border-t border-blue-200 dark:border-blue-900 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <CornerUpLeft className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="min-w-0 font-b-nazanin">
                  <span className="font-bold text-blue-800 dark:text-blue-300 block text-[11px]">
                    پاسخ به {replyingTo.senderName}:
                  </span>
                  <span className="text-slate-600 dark:text-slate-300 truncate block text-xs">
                    {replyingTo.text}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Attachment Preview Bar */}
          {attachment && (
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                {attachment.type === 'image' ? (
                  <img src={attachment.url} alt="preview" className="w-9 h-9 rounded-lg object-cover border border-slate-300 dark:border-slate-700" />
                ) : attachment.type === 'video' ? (
                  <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center shrink-0">
                    <Video className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-bold text-xs truncate text-slate-800 dark:text-slate-200">{attachment.name}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{attachment.size}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="text-slate-400 hover:text-red-500 cursor-pointer p-1"
                title={isPersian ? 'حذف پیوست' : 'Remove attachment'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Attachment Uploading/Processing Progress */}
          {isUploadingAttachment && (
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 border-t border-blue-200 dark:border-blue-900 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
              <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>{isPersian ? 'در حال آماده‌سازی و بهینه‌سازی فایل ارسالی...' : 'Preparing and optimizing file...'}</span>
            </div>
          )}

          {/* Emoji tray popup */}
          {showEmojiPicker && (
            <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2 animate-in fade-in">
              {COMMON_EMOJIS.map(em => (
                <button
                  key={em}
                  type="button"
                  onClick={() => {
                    setInputText(prev => prev + em);
                    setShowEmojiPicker(false);
                  }}
                  className="w-8 h-8 text-lg rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-transform hover:scale-125 cursor-pointer"
                >
                  {em}
                </button>
              ))}
            </div>
          )}

          {/* Message Input Form */}
          <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              {/* Attachment Button */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAttachment || isSending}
                className="p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
                title={isPersian ? 'ارسال عکس، فیلم یا فایل' : 'Attach image, video or file'}
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Emoji Button */}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2.5 rounded-xl text-slate-500 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title={isPersian ? 'افزودن اموجی' : 'Add emoji'}
              >
                <Smile className="w-4 h-4" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={isPersian ? 'پیام خود را بنویسید...' : 'Type a message...'}
                className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-b-nazanin font-medium"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={(!inputText.trim() && !attachment) || isSending || isUploadingAttachment}
                className="p-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer font-bold text-xs"
              >
                <span>{isSending ? (isPersian ? 'در حال ارسال...' : 'Sending...') : (isPersian ? 'ارسال' : 'Send')}</span>
                {isSending ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 rotate-180" />
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
