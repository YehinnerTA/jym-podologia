import React from 'react';
import Header from '../../features/header/components/Header';

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    return (
        <>
            <Header />
            <main className="jym-main">{children}</main>
        </>
    );
};

export default MainLayout;