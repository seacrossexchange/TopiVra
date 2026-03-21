import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Avatar, Badge, Button, Input, message, Spin, Empty } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useI18n } from '@/hooks/useI18n';
import { useMessageStore } from '@/store/messageStore';
import { useAuthStore } from '@/store/authStore';
import PageLoading from '@/components/common/PageLoading';
import type { Conversation } from '@/services/messages';
import './Messages.css';

const Messages = () => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const { t } = useTranslation();
  const { formatDateTime, formatDate } = useI18n();
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
      message.error(t('messages.sendFailedRetry', '发送失败，请重试'));
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const formatMessageTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days <= 0) {
      return formatDateTime(date);
    }

    if (days === 1) {
      return t('common.yesterday', '昨天');
    }

    if (days < 7) {
      return t('common.daysAgo', '{{count}}天前', { count: days });
    }

    return formatDate(date);
  };

  if (isLoading && conversations.length === 0) {
    return <PageLoading />;
  }

  return (
    <div className="messages-container">
      {/* 左侧会话列表 */}
      <div className="conversations-panel">
        <div className="conversations-header">
          <h2>{t('messages.title', '消息')}</h2>
          {unreadCount > 0 && (
            <Badge count={unreadCount} />
          )}
        </div>

        <div className="conversations-list">
          {conversations.length === 0 ? (
            <Empty description={t('messages.noConversations', '暂无会话')} />
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                type="button"
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
                      {conv.lastMessageAt && formatMessageTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="conversation-preview">
                    <span className="last-message">{conv.lastMessage || t('messages.noMessages', '暂无消息')}</span>
                    {conv.unreadCount > 0 && (
                      <Badge count={conv.unreadCount} />
                    )}
                  </div>
                </div>
              </button>
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
                      <div className="message-time">{formatMessageTime(msg.createdAt)}</div>
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
                onKeyDown={handleInputKeyDown}
                placeholder={t('messages.inputPlaceholder', '输入消息...')}
                autoSize={{ minRows: 1, maxRows: 4 }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
              >
                {t('messages.send', '发送')}
              </Button>
            </div>
          </>
        ) : (
          <div className="no-conversation">
            <Empty description={t('messages.selectConversationToStart', '选择一个会话开始聊天')} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;