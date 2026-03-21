import { Link } from 'react-router-dom';
import { GithubOutlined, TwitterOutlined, MailOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/apiClient';
import { useI18nHref } from '@/hooks/useI18nNavigate';
import './Footer.css';

interface SiteSettings {
  socialGithub?: string;
  socialTwitter?: string;
  supportEmail?: string;
  workingHours?: string;
}

export default function Footer() {
  const { t } = useTranslation();
  const { getHref } = useI18nHref();
  const currentYear = new Date().getFullYear();

  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ['site-settings-public'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/config/public', { skipAuthRedirect: true });
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const githubUrl = settings?.socialGithub || 'https://github.com';
  const twitterUrl = settings?.socialTwitter || 'https://twitter.com';
  const supportEmail = settings?.supportEmail || 'support@topivra.com';
  const workingHours = settings?.workingHours || t('footer.workingHoursVal', '09:00–22:00（UTC+8）');

  return (
    <footer className="footer">
      <div className="footer__container">

        {/* Brand */}
        <div className="footer__brand">
          <div className="footer__logo-wrap">
          <div className="footer__logo-mark">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <linearGradient id="fbg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FF9A5C"/>
                  <stop offset="48%" stopColor="#FF4D8C"/>
                  <stop offset="100%" stopColor="#7C3AED"/>
                </linearGradient>
                <linearGradient id="fgl" x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28"/>
                  <stop offset="55%" stopColor="#ffffff" stopOpacity="0.06"/>
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
                </linearGradient>
                <linearGradient id="ftg" x1="0" y1="0" x2="10" y2="32" gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor="#FFFFFF"/>
                  <stop offset="60%" stopColor="#FFF3DC"/>
                  <stop offset="100%" stopColor="#FFD98A"/>
                </linearGradient>
                <filter id="fts" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#3B0764" floodOpacity="0.55"/>
                </filter>
              </defs>
              <rect x="1" y="1" width="30" height="30" rx="8" ry="8" fill="url(#fbg)"/>
              <rect x="1" y="1" width="30" height="30" rx="8" ry="8" fill="url(#fgl)"/>
              <rect x="1.5" y="1.5" width="29" height="29" rx="7.5" ry="7.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.7"/>
              <path
                d="M6.5 9 L6.5 12.2 Q6.5 13 7.3 13 L13.2 13 L13.2 23.2 Q13.2 24 14 24 L18 24 Q18.8 24 18.8 23.2 L18.8 13 L24.7 13 Q25.5 13 25.5 12.2 L25.5 9 Q25.5 8 24.5 8 L7.5 8 Q6.5 8 6.5 9 Z"
                fill="url(#ftg)"
                filter="url(#fts)"
              />
            </svg>
          </div>
            <h3 className="footer__logo">TopiVra</h3>
          </div>
          <p className="footer__description">{t('footer.slogan')}</p>
          <div className="footer__social">
            <a href={githubUrl} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <GithubOutlined />
            </a>
            <a href={twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <TwitterOutlined />
            </a>
            <a href={`mailto:${supportEmail}`} aria-label="Email">
              <MailOutlined />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div className="footer__links">
          <h4>{t('footer.quickLinks')}</h4>
          <ul>
            <li><Link to={getHref('/')}>{t('footer.home')}</Link></li>
            <li><Link to={getHref('/products')}>{t('footer.products')}</Link></li>
            <li><Link to={getHref('/about')}>{t('footer.about')}</Link></li>
            <li><Link to={getHref('/blog')}>{t('footer.tutorials')}</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div className="footer__links">
          <h4>{t('footer.support')}</h4>
          <ul>
            <li><Link to={getHref('/terms')}>{t('footer.terms')}</Link></li>
            <li><Link to={getHref('/privacy')}>{t('footer.privacy')}</Link></li>
            <li><Link to={getHref('/refund')}>{t('footer.refund')}</Link></li>
            <li><Link to={getHref('/apply-seller')}>{t('footer.applySeller')}</Link></li>
          </ul>
        </div>

        {/* Working Hours */}
        <div className="footer__hours-col">
          <h4>{t('footer.workingHours', '客服时间')}</h4>
          <ul className="footer__hours-list">
            <li className="footer__hours-item">
              <span className="footer__hours-day">{t('footer.workdayLabel', 'Mon – Fri')}</span>
              <span className="footer__hours-time">{workingHours}</span>
            </li>
            <li className="footer__hours-note">
              {t('footer.weekendNote', '紧急问题请提交工单')}
            </li>
          </ul>
        </div>

      </div>

      {/* Copyright */}
      <div className="footer__bottom">
        <p>&copy; {currentYear} TopiVra. {t('footer.rights')}</p>
      </div>
    </footer>
  );
}
