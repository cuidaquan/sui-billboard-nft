import React from 'react';
import { Layout, Typography } from 'antd';
import './Footer.scss';

const { Footer } = Layout;
const { Text, Link } = Typography;

const AppFooter: React.FC = () => {
  return (
    <Footer className="app-footer">
      <Text>链上动态广告牌NFT系统 &copy; {new Date().getFullYear()}</Text>
      <div className="footer-links">
        <Link href="https://sui.io/" target="_blank">Sui区块链</Link>
        <Link href="https://github.com/" target="_blank">GitHub仓库</Link>
        <Link href="/about">关于我们</Link>
      </div>
    </Footer>
  );
};

export default AppFooter; 