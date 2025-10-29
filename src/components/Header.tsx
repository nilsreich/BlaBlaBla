import React from 'react';




const Header: React.FC = () => {
  return (
    <header className="text-center mb-4">
      <div className="inline-flex flex-col items-center gap-3 mb-3">
        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent tracking-tighter">
          BlaBlaBla
        </h1>
      </div>
    </header>
  );
};

export default Header;
