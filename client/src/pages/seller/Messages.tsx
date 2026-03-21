import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Avatar, Badge, Button, Input, message, Spin, Empty } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import { useMessageStore } from '@/store/messageStore';
import { useAuthStore } from '@/store/authStore';
import PageLoading from '@/components/common/PageLoading';
import type { Conversation } from '@/services/messages';
import '../user/Messages.css';

const SellerMessages = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  
  const { user } = useAuthStore();
  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    unreadCount,
    fetchConversations,
    fetchMessages,
    sendMessage,
    setCurrentConversation,
    markAsRead,
  } = useMessageStore();

  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 选择会话
  const handleSelectConversation = (conv: Conversation) => {
    setCurrentConversation(conv);
    fetchMessages(conv.otherUser.id);
  };

  // 加载会话列表
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // 如果URL中有userId，自动打开对应会话
  useEffect(() => {
    if (userId && conversations.length > 0) {
      const targetConv = conversations.find(c => c.otherUser.id === userId);
      if (targetConv) {
        handleSelectConversation(targetConv);
      }
    }
  }, [userId, conversations]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 标记已读
  useEffect(() => {
    if (currentConversation && messages.length > 0) {
      const unreadMessages = messages
        .filter(m => !m.isRead && m.senderId === currentConversation.otherUser.id)
        .map(m => m.id);
      
      if (unreadMessages.length > 0) {
        markAsRead(unreadMessages);
      }
    }
  }, [currentConversation, messages, markAsRead]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !currentConversation) return;

    try {
      await sendMessage({
        receiverId: currentConversation.otherUser.id,
        content: inputValue.trim(),
        messageType: 'TEXT',
      });
      setInputValue('');
    } catch {
      message.error(t('messages.sendError'));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return t('messages.yesterday');
    } else if (days < 7) {
      return t('messages.daysAgo', { days });
    } else {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }
  };

  if (isLoading && conversations.length === 0) {
    return <PageLoading />;
  }

  return (
    <div className="messages-container">
      {/* 左侧会话列表 */}
      <div className="conversations-panel">
        <div className="conversations-header">
          <h2>{t('messages.customerMessages')}</h2>
          {unreadCount > 0 && (
            <Badge count={unreadCount} />
          )}
        </div>
        
        <div className="conversations-list">
          {conversations.length === 0 ? (
            <Empty description={t('messages.noConversations')} />
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`conversation-item ${currentConversation?.id === conv.id ? 'active' : ''}`}
                onClick={() => handleSelectConversation(conv)}
              >
                <Avatar 
                  src={conv.otherUser.avatar} 
                  icon={<UserOutlined />}
                  size={48}
                />
                <div className="conversation-content">
                  <div className="conversation-header">
                    <span className="conversation-name">{conv.otherUser.username}</span>
                    <span className="conversation-time">
                      {conv.lastMessageAt && formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="conversation-preview">
                    <span className="last-message">{conv.lastMessage || t('messages.noMessage')}</span>
                    {conv.unreadCount > 0 && (
                      <Badge count={conv.unreadCount} />
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧聊天窗口 */}
      <div className="chat-panel">
        {currentConversation ? (
          <>
            {/* 聊天头部 */}
            <div className="chat-header">
              <Avatar 
                src={currentConversation.otherUser.avatar}
                icon={<UserOutlined />}
              />
              <span className="chat-user-name">{currentConversation.otherUser.username}</span>
            </div>

            {/* 消息列表 */}
            <div className="messages-list" ref={messagesContainerRef}>
              {isLoading && messages.length === 0 ? (
                <div className="messages-loading">
                  <Spin />
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`message-item ${msg.senderId === user?.id ? 'sent' : 'received'}`}
                  >
                    <div className="message-bubble">
                      <div className="message-content">{msg.content}</div>
                      <div className="message-time">{formatTime(msg.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div className="message-input-area">
              <Input.TextArea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('messages.inputPlaceholder')}
                autoSize={{ minRows: 1, maxRows: 4 }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
              >
                {t('messages.send')}
              </Button>
            </div>
          </>
        ) : (
          <div className="no-conversation">
            <Empty description={t('messages.selectConversation')} />
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerMessages;