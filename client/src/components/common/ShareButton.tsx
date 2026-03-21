import React from 'react';
import { Tooltip, message, Modal, Button } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import { useState } from 'react';

// 各平台 SVG 图标（官方品牌色 + 路径）
function PlatformSvg({ platform }: { platform: string }) {
  const style = { width: 18, height: 18, display: 'block' as const };
  switch (platform) {
    case 'wechat': return (
      <svg style={style} viewBox="0 0 24 24" fill="currentColor">
        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c-.305-.975-.463-2-.463-3.057 0-4.012 3.75-7.27 8.378-7.27.162 0 .325.006.487.012C15.857 4.276 12.567 2.188 8.69 2.188zm-2.466 3.66a1.066 1.066 0 110 2.133 1.066 1.066 0 010-2.133zm4.932 0a1.066 1.066 0 110 2.133 1.066 1.066 0 010-2.133zM24 14.48c0-3.518-3.381-6.38-7.547-6.38-4.167 0-7.548 2.862-7.548 6.38 0 3.519 3.381 6.38 7.548 6.38.956 0 1.87-.152 2.72-.422a.772.772 0 01.648.082l1.526.892a.263.263 0 00.261-.263.57.57 0 00-.042-.19l-.342-1.29a.523.523 0 01.19-.594C23.083 18.218 24 16.435 24 14.48zm-9.947-1.187a.96.96 0 110-1.92.96.96 0 010 1.92zm4.8 0a.96.96 0 110-1.92.96.96 0 010 1.92z"/>
      </svg>
    );
    case 'twitter': return (
      <svg style={style} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    );
    case 'facebook': return (
      <svg style={style} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    );
    case 'telegram': return (
      <svg style={style} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    );
    case 'whatsapp': return (
      <svg style={style} viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    );
    case 'reddit': return (
      <svg style={style} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.33.33 0 00-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.232-.095z"/>
      </svg>
    );
    case 'linkedin': return (
      <svg style={style} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    );
    case 'line': return (
      <svg style={style} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031a.64.64 0 01-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/>
      </svg>
    );
    default: return <span style={{ fontSize: 14, fontWeight: 700 }}>{platform[0].toUpperCase()}</span>;
  }
}

const SHARE_CONFIG: { key: string; title: string; color: string }[] = [
  { key: 'wechat',   title: '微信',        color: '#07C160' },
  { key: 'twitter',  title: 'Twitter / X', color: '#000000' },
  { key: 'facebook', title: 'Facebook',    color: '#1877F2' },
  { key: 'telegram', title: 'Telegram',    color: '#26A5E4' },
  { key: 'whatsapp', title: 'WhatsApp',    color: '#25D366' },
  { key: 'reddit',   title: 'Reddit',      color: '#FF4500' },
  { key: 'linkedin', title: 'LinkedIn',    color: '#0A66C2' },
  { key: 'line',     title: 'LINE',        color: '#06C755' },
];

interface ShareBarProps {
  url?: string;
  title?: string;
  text?: string;
  ogImage?: string;
}

export function ShareBar({ url, title = 'TopiVra', text, ogImage }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareText = text || title;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      message.success('链接已复制');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      message.error('复制失败');
    }
  };

  const handleShare = (platform: string) => {
    if (platform === 'wechat') {
      Modal.info({
        title: '微信分享',
        icon: null,
        okText: '关闭',
        content: (
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 12 }}>请复制链接后在微信中打开，或截图分享给好友</p>
            <div style={{ background: 'var(--color-bg-secondary)', padding: '10px 14px', borderRadius: 8, fontSize: 13, wordBreak: 'break-all', color: 'var(--color-text-primary)', userSelect: 'all' }}>
              {shareUrl}
            </div>
            <Button type="primary" style={{ marginTop: 12 }} onClick={() => { navigator.clipboard.writeText(shareUrl); message.success('已复制'); }}>
              复制链接
            </Button>
          </div>
        ),
      });
      return;
    }
    const links: Record<string, string> = {
      twitter:  `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}${ogImage ? `&via=TopiVra` : ''}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`,
      whatsapp: `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + shareUrl + (ogImage ? '\n🛒 ' + shareUrl : ''))}`,
      reddit:   `https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(title)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      line:     `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`,
    };
    const link = links[platform];
    if (link) window.open(link, '_blank', 'width=600,height=500,noopener,noreferrer');
  };

  return (
    <div className="product-share-bar">
      <span className="product-share-label">分享：</span>
      <div className="product-share-btns">
        {SHARE_CONFIG.map(({ key, title: t, color }) => (
          <Tooltip key={key} title={t}>
            <button
              className="product-share-btn"
              onClick={() => handleShare(key)}
              aria-label={t}
              style={{ '--share-color': color } as React.CSSProperties}
            >
              <PlatformSvg platform={key} />
            </button>
          </Tooltip>
        ))}
        <Tooltip title={copied ? '已复制！' : '复制链接'}>
          <button className="product-share-btn product-share-copy" onClick={handleCopy} aria-label="复制链接">
            {copied
              ? <CheckOutlined style={{ fontSize: 16, color: 'var(--color-success)' }} />
              : <CopyOutlined style={{ fontSize: 16 }} />
            }
          </button>
        </Tooltip>
      </div>
    </div>
  );
}

