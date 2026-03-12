import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const { Content } = Layout;

export default function MainLayout() {
  return (
    <Layout style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Content style={{ flex: 1 }}>
        <Outlet />
      </Content>
      <Footer />
    </Layout>
  );
}














