import { useTranslation } from 'react-i18next';
import { Button, Result } from 'antd';
import { useNavigate } from 'react-router-dom';
import { HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons';

export default function NotFound() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Result
        status="404"
        title="404"
        subTitle={t('notFound.message', '抱歉，您访问的页面不存在')}
        extra={[
          <Button
            key="back"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
          >
            {t('common.back', '返回')}
          </Button>,
          <Button
            key="home"
            type="primary"
            icon={<HomeOutlined />}
            onClick={() => navigate('/')}
          >
            {t('nav.home', '首页')}
          </Button>,
        ]}
      />
    </div>
  );
}